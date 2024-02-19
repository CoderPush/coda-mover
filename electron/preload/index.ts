import { contextBridge } from 'electron'

console.log('main:ws_url', process.env.WEBSOCKET_URL)

contextBridge.exposeInMainWorld('envs', {
  WEBSOCKET_URL: process.env.WEBSOCKET_URL,
})
