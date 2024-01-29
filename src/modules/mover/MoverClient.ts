import { io } from 'socket.io-client'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS } from './events'
import type { ICodaDoc, IItemStatus, ICodaItem, ICodaItems, IItemStatuses } from './interfaces'

export class MoverClient {
  items: Record<string, ICodaItem> = {}
  itemStatuses: IItemStatuses = {}

  readonly socket = io('/', {
    path: '/api/mover/io',
  })

  constructor () {
    this.socket.on('connect', () => {
      console.info('[mover] connected')
    })
  }

  syncDocs (apiToken: string) {
    console.info('[mover]', CLIENT_SYNC_DOCS)
    this.socket.emit(CLIENT_SYNC_DOCS, apiToken)
  }

  handleServerResponses (
    onItems: (items: ICodaItems) => void,
    onStatuses: (itemStatuses: Record<string, IItemStatus>) => void,
  ) {
    this.socket.on(ITEM_STATUS, (item: IItemStatus) => {
      console.info('[mover] - ', item.id, item.status)
      this.itemStatuses = {
        ...this.itemStatuses,
        [item.id]: item,
      }

      onStatuses(this.itemStatuses)
    })

    this.socket.on(SERVER_RETURN_DOCS, (docs: ICodaDoc[]) => {
      console.info('[mover]', SERVER_RETURN_DOCS)
      const items = { ...this.items } // clone items

      docs.forEach(doc => {
        items[doc.id] = doc
      })

      this.items = items

      onItems(Object.values(this.items))
    })
  }
}
