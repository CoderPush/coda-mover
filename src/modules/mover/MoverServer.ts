import { TaskEmitter } from '@abxvn/tasks'
import { type Socket } from 'socket.io'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS } from './events'
import { CodaApis } from '../coda-doc-puller/CodaApis'
import { type ICodaDoc } from '../coda-doc-puller/interfaces'

export class MoverServer {
  readonly tasks: TaskEmitter

  constructor (readonly socket: Socket) {
    this.tasks = new TaskEmitter({
      concurrency: 3,
      onItemError (item, error) {
        socket.emit(ITEM_STATUS, { id: item.id, status: 'error', message: error.message })
      },
      onItemDone (item) {
        socket.emit(ITEM_STATUS, { id: item.id, status: 'done' })
      },
    })
  }

  handleClientRequests () {
    this.handleClientSyncDocs()
  }

  handleClientSyncDocs () {
    this.socket.on(CLIENT_SYNC_DOCS, async (apiToken: string) => {
      const apiDocs = await CodaApis.listDocs(apiToken)
      const docs: ICodaDoc[] = apiDocs.map(doc => ({
        ...doc,
        treePath: '/', // docs are based at root
        filePath: doc.name, // TODO: remove invalid chars for file path
      }))

      this.socket.emit(SERVER_RETURN_DOCS, docs)
      this.notifyStatus(CLIENT_SYNC_DOCS, 'done')
    })
  }

  private notifyStatus (item: string, status: string, message?: string) {
    this.socket.emit(ITEM_STATUS, { id: item, status, message })
  }
}
