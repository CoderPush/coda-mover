import { resolve } from 'path'

export const rootPath = resolve(__dirname, '../../../../')
  .replace(/\\/g, '/') // fix path separator for windows
export const dataPath = `${rootPath}/data`

export const codaDocsPath = `${dataPath}/docs`
export const codaJsonPath = `${dataPath}/coda.json`

export const importsPath = `${dataPath}/imports`
