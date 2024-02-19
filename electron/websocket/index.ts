import { type Server as HttpServer, createServer as createHttpServer } from 'http'
import { Server } from 'socket.io'
import { MoverServer } from '@/modules/simple-mover/server'

let websocketServer: Server
let mover: MoverServer

export const initTasksServer = (httpServer: HttpServer) => {
  if (!websocketServer) {
    websocketServer = new Server(httpServer, {
      path: '/api/mover/io',
      cors: {
        origin: '*',
      },
    })

    mover = new MoverServer()

    websocketServer.on('connection', socket => {
      void mover.handleClientRequests(socket)
    })
  }
}

export const initWebsocketServer = async (port = 8678) => {
  return await new Promise<void>((resolve, reject) => {
    try {
      const httpServer = createHttpServer()

      initTasksServer(httpServer)

      httpServer.listen(port, () => resolve())
    } catch (err: any) {
      reject(err)
    }
  })
}
