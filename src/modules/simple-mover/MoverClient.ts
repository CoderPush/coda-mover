import { io } from 'socket.io-client'
import {
  CLIENT_CONFIRM_IMPORT,
  CLIENT_IMPORT_OUTLINE,
  CLIENT_LIST_DOCS,
  CLIENT_REJECT_IMPORT,
  ITEM_STATUS_CANCELLED,
  ITEM_STATUS_CONFIRMING,
  ITEM_STATUS_DONE,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_PENDING,
  ITEM_STATUS_SKIPPED,
  SERVER_IMPORT_RETURN_ISSUES,
  SERVER_RETURN_DOCS,
  SERVER_RETURN_STATUS,
} from './events'
import type {
  ICodaDoc,
  ICodaItem,
  IClient,
  IClientHandlers,
  IItemStatus,
  IItemStatuses,
  IImportLog,
} from './interfaces'

export class MoverClient implements IClient {
  private items: Record<string, ICodaItem> = {}
  private selectedItemIds: string[] = []
  private itemStatuses: IItemStatuses = {}

  constructor (private readonly handlers: IClientHandlers = {}) {}

  readonly socket = io('/', {
    path: '/api/mover/io',
  })

  listDocs (codaApiToken: string) {
    this.itemStatuses[CLIENT_LIST_DOCS] = {
      id: CLIENT_LIST_DOCS,
      status: ITEM_STATUS_PENDING,
    }
    this.socket.emit(CLIENT_LIST_DOCS, codaApiToken)
  }

  importToOutline (outlineApiToken: string) {
    this.setItemStatus({ id: CLIENT_IMPORT_OUTLINE, status: ITEM_STATUS_PENDING })
    this.handlers.onImportIssues?.([])
    this.clearImportProgress()

    this.socket.emit(
      CLIENT_IMPORT_OUTLINE,
      outlineApiToken,
      this.selectedItemIds.map(id => this.items[id]).filter(Boolean),
    )
  }

  confirmImport () {
    if (this.itemStatuses[CLIENT_IMPORT_OUTLINE].status !== ITEM_STATUS_CONFIRMING) {
      throw Error('Import is not in confirming state')
    }

    this.socket.emit(CLIENT_CONFIRM_IMPORT)
  }

  cancelImport () {
    this.handlers.onImportIssues?.([])
    this.handlers.onImportLogs?.([])
    this.clearImportProgress()

    this.socket.emit(CLIENT_REJECT_IMPORT)
    this.setItemStatus({ id: CLIENT_IMPORT_OUTLINE, status: ITEM_STATUS_CANCELLED })
  }

  handleServerResponses () {
    this.socket.on('connect', () => {
      console.info('[mover] connected')
      this.handlers.onConnection?.('opened')
    })

    this.socket.on('disconnect', () => {
      console.info('[mover] disconnected')
      this.handlers.onConnection?.('closed')
    })

    this.socket.on(SERVER_RETURN_STATUS, (item: IItemStatus) => {
      this.setItemStatus(item)
    })

    this.socket.on(SERVER_RETURN_DOCS, (docs: ICodaDoc[]) => {
      console.info('[mover]', SERVER_RETURN_DOCS)
      const items = { ...this.items } // clone items

      docs.forEach(doc => {
        items[doc.id] = doc
      })

      this.items = items

      this.handlers.onItems?.(Object.values(this.items))
    })

    this.socket.on(SERVER_IMPORT_RETURN_ISSUES, (issues: string[]) => {
      this.handlers.onImportIssues?.(issues)
    })
  }

  setItemStatus (item: IItemStatus) {
    console.info('[mover] »', item.id, item.status)

    this.itemStatuses = {
      ...this.itemStatuses,
      [item.id]: item,
    }

    this.handlers.onStatuses?.(this.itemStatuses)

    if (item.id.includes('import::')) {
      this.reportImportProgress()
    }
  }

  select (...itemIds: string[]) {
    this.selectUnqueuedItems(itemIds)
    this.handlers.onSelectionChange?.([...this.selectedItemIds])
  }

  deselect (...itemIds: string[]) {
    this.selectedItemIds = this.selectedItemIds.filter(id => !itemIds.includes(id))
    this.handlers.onSelectionChange?.([...this.selectedItemIds])
  }

  private reportImportProgress () {
    const importLogs = Object.values(this.itemStatuses).map(item => {
      const isImportLog = item.id.startsWith('import::')
      const isTrackedStatus = item.status === ITEM_STATUS_ERROR ||
        item.status === ITEM_STATUS_DONE ||
        item.status === ITEM_STATUS_SKIPPED
      const message = item.message

      if (isImportLog && isTrackedStatus && message) {
        return {
          id: item.id,
          level: item.status === ITEM_STATUS_ERROR ? 'error' : 'success',
          message,
        }
      }

      return null
    }).filter(Boolean) as IImportLog[]

    this.handlers.onImportLogs?.(importLogs)
  }

  private clearImportProgress () {
    this.itemStatuses = Object.keys(this.itemStatuses).reduce<IItemStatuses>((importExcludingStatuses, id) => {
      if (!id.startsWith('import::')) importExcludingStatuses[id] = this.itemStatuses[id]

      return importExcludingStatuses
    }, {})

    this.reportImportProgress()
  }

  private selectUnqueuedItems (itemIds: string[]) {
    const selectedItemIds = [...this.selectedItemIds]

    itemIds.forEach(id => {
      if (!selectedItemIds.includes(id)) {
        selectedItemIds.push(id)
      }
    })

    this.selectedItemIds = selectedItemIds
  }
}
