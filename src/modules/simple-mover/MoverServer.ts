import type { Socket } from 'socket.io'
import type { ICodaItem, IMover, IServer } from './interfaces'
import { CLIENT_IMPORT_OUTLINE, CLIENT_LIST_DOCS, SERVER_RETURN_STATUS } from './events'
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
      this.handleClientImportOutline()
    } catch (err: any) {
      logError(err, '[server] handle requests')
    }
  }

  handleClientListDocs () {
    this.socket.on(CLIENT_LIST_DOCS, (codaApiToken: string) => {
      try {
        // replace mover if apiToken changes or init new one if not exists
        if (this._codaApiToken !== codaApiToken && this._mover) {
          this._mover.dispose()
          this._mover = undefined
        }
        if (!this._mover) this._mover = new Mover(this, new CodaApis(codaApiToken))

        this._codaApiToken = codaApiToken
        this._mover.listDocs()
      } catch (err: any) {
        logError(err, CLIENT_LIST_DOCS)
        this.socket.emit(SERVER_RETURN_STATUS, {
          id: CLIENT_LIST_DOCS,
          status: 'error',
          message: err.message,
        })
      }
    })
  }

  handleClientImportOutline () {
    this.socket.on(CLIENT_IMPORT_OUTLINE, (outlineApiToken: string, items: ICodaItem[]) => {
      try {
        if (!this._mover) throw Error('Mover not initialized through \'handleClientListDocs\'')

        this._mover.requestImportOutline(outlineApiToken, items)
      } catch (err: any) {
        logError(err, CLIENT_IMPORT_OUTLINE)
        this.socket.emit(SERVER_RETURN_STATUS, {
          id: CLIENT_IMPORT_OUTLINE,
          status: 'error',
          message: err.message,
        })
      }
    })
  }

  emit (event: string, data: any) {
    this.socket.emit(event, data)
  }
}
