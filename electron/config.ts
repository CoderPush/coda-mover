import { resolve } from 'app-root-path'
import * as log from 'electron-log'
import nextConfig from '../next.config.mjs'
import { isDev } from './next'

export const rootPath = resolve('./')
export const distPath = `${rootPath}/dist`

export const electronDistPath = `${distPath}/electron`

export const nextDevPort = process.env.PORT ? +process.env.PORT : 3000
export const nextDirPath = rootPath
export const nextDistSubPath = nextConfig.distDir || ''

export const windowWidth = isDev ? 1300 : 800
export const windowHeight = 600

export { log }
