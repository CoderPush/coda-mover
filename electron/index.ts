import { format } from 'url'
import { BrowserWindow, app, dialog } from 'electron'
import { getPortPromise } from 'portfinder'
import { electronNext, isDev } from './next'
import { initWebsocketServer } from './websocket'
import {
  nextDevPort,
  nextDirPath,
  nextDistSubPath,
  windowHeight,
  windowWidth,
  log,
  electronDistPath,
} from './config'

// dev only, reloading all browser windows
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (isDev) require('electron-reload')(__dirname, {})

const onAppReady = async () => {
  try {
    const websocketPort = await getPortPromise()
    const websocketUrl = `ws://localhost:${websocketPort}`

    process.env.WEBSOCKET_URL = websocketUrl

    await initWebsocketServer(websocketPort)
    await electronNext({
      dirPath: nextDirPath,
      devPort: nextDevPort,
      distSubPath: nextDistSubPath,
      conf: {
        env: {
          WEBSOCKET_URL: websocketUrl,
        },
      },
    })

    const mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: `${electronDistPath}/preload/index.js`,
      },
    })

    let url = `http://localhost:${nextDevPort}/`
    if (!isDev) {
      url = format({
        pathname: `${nextDirPath}/${nextDistSubPath}/index.html`,
        protocol: 'file:',
        slashes: true,
      })
    }

    await mainWindow.loadURL(url)

    if (isDev) mainWindow.webContents.openDevTools()
  } catch (err: any) {
    dialog.showErrorBox('[app] start error', err.message as string)
    log.error('[app] start error', err)
  }
}

app.on('ready', () => {
  void onAppReady()
})

// Quit the app once all windows are closed
app.on('window-all-closed', () => app.quit())

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    void onAppReady()
  }
})
