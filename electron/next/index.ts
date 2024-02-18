// Native
import { type RequestListener, createServer } from 'http'
import { join, isAbsolute, normalize } from 'path'

// Packages
import { resolve } from 'app-root-path'
import { app, protocol } from 'electron'
import isDev from './isDev'

const devServer = async (dir: string, port: number) => {
  // We need to load it here because the app's production
  // bundle shouldn't include it, which would result in an error
  const next = require('next')({ // eslint-disable-line @typescript-eslint/no-var-requires
    dev: true,
    dir,
  })
  const requestHandler = next.getRequestHandler() as RequestListener

  // Build the renderer code and watch the files
  await next.prepare()

  // But if developing the application, create a
  // new native HTTP server (which supports hot code reloading)
  const server = createServer(requestHandler)

  server.listen(port, () => {
    // Make sure to stop the server when the app closes
    // Otherwise it keeps running on its own
    app.on('before-quit', () => server.close())
  })
}

const adjustRenderer = (dir: string) => {
  const paths = ['/_next', '/static']
  const isWindows = process.platform === 'win32'

  protocol.interceptFileProtocol('file', (request, callback) => {
    let path = request.url.substring(isWindows ? 8 : 7)

    for (const prefix of paths) {
      let newPath = path

      // On windows the request looks like: file:///C:/static/bar
      // On other systems it's file:///static/bar
      if (isWindows) {
        newPath = newPath.substring(2)
      }

      if (!newPath.startsWith(prefix)) {
        continue
      }

      // Strip volume name from path on Windows
      if (isWindows) {
        newPath = normalize(newPath)
      }

      newPath = join(dir, 'out', newPath)
      path = newPath
    }

    // Electron doesn't like anything in the path to be encoded,
    // so we need to undo that. This specifically allows for
    // Electron apps with spaces in their app names.
    path = decodeURIComponent(path)

    callback({ path })
  })
}

export const electronNext = async (dir: string, port = 3000) => {
  if (!isAbsolute(dir)) {
    dir = resolve(dir)
  }

  console.info('[electron-next] next dir', dir)

  if (!isDev) {
    adjustRenderer(dir)

    return
  }

  await devServer(dir, port)
}

export { isDev }
