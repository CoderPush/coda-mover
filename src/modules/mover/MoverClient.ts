import { io } from 'socket.io-client'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS } from './events'
import { type ICodaDoc } from '../coda-doc-puller/interfaces'
import { type IItemStatus } from './interfaces'

export class MoverClient {
  readonly socket = io('/', {
    path: '/api/mover/io',
  })

  readonly itemStatuses: Record<string, string> = {}

  constructor () {
    this.socket.on('connect', () => {
      console.info('[mover] connected')
    })
  }

  syncDocs (apiToken: string) {
    console.info('[mover]', CLIENT_SYNC_DOCS)
    this.socket.emit(CLIENT_SYNC_DOCS, apiToken)
  }

  handleServerReturnDocs (callback: (docs: ICodaDoc[]) => void) {
    this.socket.on(SERVER_RETURN_DOCS, (docs: ICodaDoc[]) => {
      console.info('[mover]', SERVER_RETURN_DOCS)
      callback(docs)
    })
  }

  handleItemStatus (callback: (item: IItemStatus) => void) {
    this.socket.on(ITEM_STATUS, (item: IItemStatus) => callback(item))
  }
}
