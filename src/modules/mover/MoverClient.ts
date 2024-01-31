import { io } from 'socket.io-client'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS, SERVER_RETURN_PAGES } from './events'
import type { ICodaDoc, IItemStatus, ICodaItem, IItemStatuses, ICodaPage, IMoverClient, IMoverClientHandlers } from './interfaces'

export class MoverClient implements IMoverClient {
  private items: Record<string, ICodaItem> = {}
  private itemStatuses: IItemStatuses = {}
  private selectedItemIds: string[] = []

  constructor (private readonly handlers: IMoverClientHandlers = {}) {}

  readonly socket = io('/', {
    path: '/api/mover/io',
  })

  syncDocs (apiToken: string) {
    console.info('[mover]', CLIENT_SYNC_DOCS)
    this.socket.emit(CLIENT_SYNC_DOCS, apiToken)
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

    this.socket.on(ITEM_STATUS, (item: IItemStatus) => {
      console.info('[mover] - ', item.id, item.status)
      this.itemStatuses = {
        ...this.itemStatuses,
        [item.id]: item,
      }

      this.handlers.onStatuses?.(this.itemStatuses)
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

    this.socket.on(SERVER_RETURN_PAGES, (pages: ICodaPage[]) => {
      console.info('[mover]', SERVER_RETURN_PAGES)
      const items = { ...this.items } // clone items

      pages.forEach(page => {
        items[page.id] = page
      })

      this.items = items

      this.handlers.onItems?.(Object.values(this.items))
    })
  }

  select (...itemIds: string[]) {
    itemIds.forEach(id => { // propagate selection into inner pages
      this.getInnerPages(id).forEach(page => {
        itemIds.push(page.id)
      })
    })

    this.selectUnqueuedItems(itemIds)
    this.handlers.onSelectionChange?.([...this.selectedItemIds])
  }

  deselect (...itemIds: string[]) {
    itemIds.forEach(id => { // propagate deselection into inner pages
      this.getInnerPages(id).forEach(page => {
        itemIds.push(page.id)
      })
    })

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

  private getInnerPages (itemId: string): ICodaPage[] {
    const item = this.items[itemId]
    if (!item) return []

    const itemTreePath = item.treePath
    const innerPages: ICodaPage[] = []

    Object.values(this.items).forEach((page: ICodaPage) => {
      if (page.treePath.startsWith(`${itemTreePath}${item.id}/`) && page.id !== itemId) {
        innerPages.push(page)
      }
    })

    return innerPages
  }
}
