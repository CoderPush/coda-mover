import { type ITaskPriority, TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { type Socket } from 'socket.io'
import { CLIENT_SYNC_DOCS, ITEM_STATUS } from './events'
import type { ICodaItem, IMoverServer, IPuller } from './interfaces'
import { isAxiosError } from 'axios'
import { MoverServerPuller } from './MoverServerPuller'
import { CodaApis } from './apis'

export class MoverServer implements IMoverServer {
  readonly pullers: Record<string, IPuller> = {}
  readonly tasks = new TaskEmitter({
    concurrency: 3,
    onItemError: (item, error) => {
      // automatically retry with lower priority if too many requests
      // most likely caused by rate limiting of exporting pages
      if (isAxiosError(error) && error.response?.status === 429) {
        this.tasks.add({ ...item, priority: TaskPriority.LOW })
      }

      this.logError(error, item.id)
    },
    onItemDone: item => {
      this.notifyStatus(item.id!, 'done')
    },
  })

  private _socket: Socket | undefined
  items: Record<string, ICodaItem> = {}

  get socket (): Socket {
    if (!this._socket) {
      throw Error('[mover] socket needs to be provided using \'handleClientRequests\'')
    }

    return this._socket
  }

  async handleClientRequests (socket: Socket) {
    // ensure old listeners detached when replacing socket
    if (this._socket) this._socket.removeAllListeners()
    this._socket = socket

    try {
      this.handleClientSyncDocs()
    } catch (err: any) {
      console.error('[mover] handle requests', err)
      this.notifyStatus('handle requests', 'error', err.message as string)
    }
  }

  handleClientSyncDocs () {
    this.socket.on(CLIENT_SYNC_DOCS, async (apiToken: string) => {
      const puller = this.pullers[apiToken] = new MoverServerPuller(this, new CodaApis(apiToken))

      await puller.syncDocs()
      this.tasks.next()
    })
  }

  emit (event: string, data: any) {
    this.socket.emit(event, data)
  }

  queue (id: string, execute: () => any, priority?: ITaskPriority) {
    this.tasks.add({
      id,
      execute,
      priority: priority ?? TaskPriority.NORMAL,
    })
  }

  notifyStatus (item: string, status: string, message?: string) {
    this.socket.emit(ITEM_STATUS, { id: item, status, message })
  }

  logError (error: Error, itemId?: string) {
    if (isAxiosError(error)) {
      console.error(
        '[mover]',
        `${itemId} request error`,
        `${error.config?.method} ${error.config?.url}`,
        error.response?.status,
        error.response?.data?.message || error.response?.data?.error,
      )
    } else {
      console.error('[mover]', `${itemId} error`, error)
    }

    itemId && this.notifyStatus(itemId, 'error', error.message)
  }
}
