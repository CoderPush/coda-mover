import { io } from 'socket.io-client'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS, SERVER_RETURN_PAGES } from './events'
import type { ICodaDoc, IItemStatus, ICodaItem, IItemStatuses, ICodaPage, IMoverClient, IMoverClientHandlers } from './interfaces'

export class MoverClient implements IMoverClient {
  private items: Record<string, ICodaItem> = {}
  private itemStatuses: IItemStatuses = {}

  readonly socket = io('/', {
    path: '/api/mover/io',
  })

  syncDocs (apiToken: string) {
    console.info('[mover]', CLIENT_SYNC_DOCS)
    this.socket.emit(CLIENT_SYNC_DOCS, apiToken)
  }

  handleServerResponses ({
    onConnection,
    onItems,
    onStatuses,
  }: IMoverClientHandlers = {}) {
    this.socket.on('connect', () => {
      console.info('[mover] connected')
      onConnection?.('opened')
    })

    this.socket.on('disconnect', () => {
      console.info('[mover] disconnected')
      onConnection?.('closed')
    })

    this.socket.on(ITEM_STATUS, (item: IItemStatus) => {
      console.info('[mover] - ', item.id, item.status)
      this.itemStatuses = {
        ...this.itemStatuses,
        [item.id]: item,
      }

      onStatuses?.(this.itemStatuses)
    })

    this.socket.on(SERVER_RETURN_DOCS, (docs: ICodaDoc[]) => {
      console.info('[mover]', SERVER_RETURN_DOCS)
      const items = { ...this.items } // clone items

      docs.forEach(doc => {
        items[doc.id] = doc
      })

      this.items = items

      onItems?.(Object.values(this.items))
    })

    this.socket.on(SERVER_RETURN_PAGES, (pages: ICodaPage[]) => {
      console.info('[mover]', SERVER_RETURN_PAGES)
      const items = { ...this.items } // clone items

      pages.forEach(page => {
        items[page.id] = page
      })

      this.items = items

      onItems?.(Object.values(this.items))
    })
  }
}
