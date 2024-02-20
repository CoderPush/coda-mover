// Native
import { type RequestListener, createServer } from 'http'
import { join, normalize } from 'path'
import { type default as CreateNextServer } from 'next'

// Packages
import { app, protocol } from 'electron'
import isDev from './isDev'
import { type IElectronNextOptions } from './interfaces'

const devServer = async (options: IElectronNextOptions) => {
  // We need to load it here because the app's production
  // bundle shouldn't include it, which would result in an error
  const createNextServer: typeof CreateNextServer = require('next') // eslint-disable-line @typescript-eslint/no-var-requires
  const next = createNextServer({
    dev: true,
    dir: options.dirPath,
    conf: options.conf,
  })

  const requestHandler = next.getRequestHandler() as RequestListener

  // Build the renderer code and watch the files
  await next.prepare()

  // But if developing the application, create a
  // new native HTTP server (which supports hot code reloading)
  const server = createServer(requestHandler)

  server.listen(options.devPort, () => {
    // Make sure to stop the server when the app closes
    // Otherwise it keeps running on its own
    app.on('before-quit', () => server.close())
  })
}

const adjustRenderer = (options: IElectronNextOptions) => {
  const dir = options.dirPath
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

      newPath = join(dir, options.distSubPath, newPath)
      path = newPath
    }

    // Electron doesn't like anything in the path to be encoded,
    // so we need to undo that. This specifically allows for
    // Electron apps with spaces in their app names.
    path = decodeURIComponent(path)

    if (path.includes('/_next/image?url=')) {
      path = path.replace(/(.+)\/_next\/image\?url=([^&]+)(&.+)?/, (_, nextDist, subPath) => {
        return `${nextDist}${subPath}`
      })
    }

    callback({ path })
  })
}

export const electronNext = async (options: IElectronNextOptions) => {
  if (!isDev) {
    adjustRenderer(options)

    return
  }

  await devServer(options)
}

export { isDev }
