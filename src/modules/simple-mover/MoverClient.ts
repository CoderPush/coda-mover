import { io } from 'socket.io-client'
import {
  CLIENT_IMPORT_OUTLINE,
  CLIENT_LIST_DOCS, ITEM_STATUS_CANCELLED, ITEM_STATUS_PENDING, SERVER_RETURN_DOCS, SERVER_RETURN_STATUS,
} from './events'
import type {
  ICodaDoc,
  ICodaItem,
  IClient,
  IClientHandlers,
  IItemStatus,
  IItemStatuses,
} from './interfaces'
import { SERVER_IMPORT_ISSUES } from '../mover/events'

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

    this.socket.emit(
      CLIENT_IMPORT_OUTLINE,
      outlineApiToken,
      this.selectedItemIds.map(id => this.items[id]).filter(Boolean),
    )
  }

  cancelImport () {
    this.handlers.onImportIssues?.([])
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

    this.socket.on(SERVER_IMPORT_ISSUES, (issues: string[]) => {
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
  }

  select (...itemIds: string[]) {
    this.selectUnqueuedItems(itemIds)
    this.handlers.onSelectionChange?.([...this.selectedItemIds])
  }

  deselect (...itemIds: string[]) {
    this.selectedItemIds = this.selectedItemIds.filter(id => !itemIds.includes(id))
    this.handlers.onSelectionChange?.([...this.selectedItemIds])
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
