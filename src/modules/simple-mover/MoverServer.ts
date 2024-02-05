import type { Socket } from 'socket.io'
import type { IMover, IServer } from './interfaces'
import { CLIENT_LIST_DOCS } from './events'
import { Mover } from './Mover'
import { CodaApis } from './apis'
import { logError } from './lib'

export class MoverServer implements IServer {
  private _socket: Socket | undefined
  private _codaApiToken: string | undefined
  private _mover: IMover | undefined

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
      this.handleClientListDocs()
    } catch (err: any) {
      logError(err, '[server] handle requests')
    }
  }

  handleClientListDocs () {
    this.socket.on(CLIENT_LIST_DOCS, (apiToken: string) => {
      // replace mover if apiToken changes or init new one if not exists
      if (this._codaApiToken !== apiToken && this._mover) this._mover = undefined
      if (!this._mover) this._mover = new Mover(this, new CodaApis(apiToken))

      this._codaApiToken = apiToken
      this._mover.listDocs()
    })
  }

  emit (event: string, data: any) {
    this.socket.emit(event, data)
  }
}
