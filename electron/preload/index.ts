import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('envs', {
  WEBSOCKET_URL: process.env.WEBSOCKET_URL,
})
