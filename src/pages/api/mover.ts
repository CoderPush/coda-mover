// Until Next exposes http server instance from its endpoints or config
// Temporarily use `pages` folder to access Next server instance to combine with socket.io

import { MoverServer } from '@/modules/simple-mover/server'
import { type Server as HttpServer } from 'http'
import { type NextApiResponse } from 'next'
import { Server } from 'socket.io'

let websocketServer: Server
let mover: MoverServer

const initTasksServer = (req: any, res: NextApiResponse) => {
  if (!websocketServer) {
    const httpServer = (res.socket as any).server as HttpServer

    websocketServer = new Server(httpServer, {
      path: '/api/mover/io',
    })

    mover = new MoverServer()

    websocketServer.on('connection', socket => {
      void mover.handleClientRequests(socket)
    })
  }

  res.send('OK')
  res.end()
}

export default initTasksServer
