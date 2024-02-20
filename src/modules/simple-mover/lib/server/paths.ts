import { userDataPath } from './electron'

export const dataPath = `${userDataPath}/coda-mover/data`
  .replace(/\\/g, '/') // fix path separator for windows

export const itemsJsonPath = `${dataPath}/items.json`
export const codaDocsPath = `${dataPath}/docs`
export const importsPath = `${dataPath}/imports`
