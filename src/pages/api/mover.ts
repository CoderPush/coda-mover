// Until Next exposes http server instance from its endpoints or config
// Temporarily use `pages` folder to access Next server instance to combine with socket.io

import { MoverServer } from '@/modules/mover'
import { type Server as HttpServer } from 'http'
import { type NextApiResponse } from 'next'
import { Server } from 'socket.io'

let websocketServer: Server

const initTasksServer = (req: any, res: NextApiResponse) => {
  if (!websocketServer) {
    const httpServer = (res.socket as any).server as HttpServer

    websocketServer = new Server(httpServer, {
      path: '/api/mover/io',
    })

    websocketServer.on('connection', socket => {
      const mover = new MoverServer(socket)

      mover.handleClientRequests()
    })
  }

  res.send('OK')
  res.end()
}

export default initTasksServer
