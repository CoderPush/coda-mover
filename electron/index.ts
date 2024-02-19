import { format } from 'url'
import { BrowserWindow, app, dialog } from 'electron'
import { electronNext, isDev } from './next'
import { initWebsocketServer } from './websocket'
import { nextDevPort, nextDirPath, nextDistSubPath, windowHeight, windowWidth, log } from './config'

// dev only, reloading all browser windows
// eslint-disable-next-line @typescript-eslint/no-var-requires
if (isDev) require('electron-reload')(__dirname, {})

const onAppReady = async () => {
  try {
    await initWebsocketServer()
    await electronNext({
      dirPath: nextDirPath,
      devPort: nextDevPort,
      distSubPath: nextDistSubPath,
    })

    const mainWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        // preload: join(__dirname, 'preload.js'),
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
