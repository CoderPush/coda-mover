import { isAxiosError } from 'axios'
import type { ICodaItem } from '../../interfaces'
import { codaDocsPath } from './paths'
import { log } from './electron'

export const getCurrentIsoDateTime = () => {
  return (new Date()).toISOString()
}

export const logError = (error: any, itemId?: string) => {
  if (isAxiosError(error)) {
    log.error(
      `[${itemId}] request error`,
      `${error.config?.method} ${error.config?.url}`,
      error.response?.status,
      error.response?.data?.message || error.response?.data?.error,
    )
  } else {
    log.error(`[${itemId}] error`, error)
  }
}

export const trimSlashes = (str: string) => {
  return str.replace(/^\/+|\/+$/g, '')
}

export const getParentDir = (item: ICodaItem, items: Record<string, ICodaItem>) => {
  const parentIds = trimSlashes(item.treePath).split('/')
  const parentDirSubPath = parentIds.map(id => {
    const parent = items[id]
    if (!parent) throw Error(`[${item.id}] parent id ${id} not synced`)

    return parent.name
  }).join('/')

  return `${codaDocsPath}/${parentDirSubPath}`
}
