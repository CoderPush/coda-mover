import { join } from 'path'
import { format } from 'url'
import { BrowserWindow, app, dialog } from 'electron'
import { electronNext, isDev } from './next'
import electronReload from 'electron-reload'

// dev only, reloading all browser windows
electronReload(__dirname, {})

const nextPort = 3000
const onAppReady = async () => {
  try {
    await electronNext('./', nextPort)

    const mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: join(__dirname, 'preload.js'),
      },
    })

    const url = isDev
      ? `http://localhost:${nextPort}/`
      : format({
        pathname: join(__dirname, '../next/index.html'),
        protocol: 'file:',
        slashes: true,
      })

    await mainWindow.loadURL(url)
  } catch (err: any) {
    dialog.showErrorBox('[app] start error', [
      err.message as string,
      err.stack as string,
    ].join('\n'))
  }
}

// Prepare the renderer once the app is ready
app.on('ready', () => {
  void onAppReady()
})

// Quit the app once all windows are closed
app.on('window-all-closed', () => app.quit())
