import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { type Socket } from 'socket.io'
import { createWriteStream, ensureDir, pathExists, readJson, rename, writeJson } from 'fs-extra'
import { resolve } from 'path'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS, SERVER_RETURN_PAGES } from './events'
import { CodaApis, download } from '../coda-doc-puller/CodaApis'
import type { ICodaDoc, ICodaItem, ICodaItems, ICodaApiDoc, ICodaApiPage, ICodaPage } from './interfaces'
import { isAxiosError } from 'axios'

const rootPath = resolve(__dirname, '../../../../').replace(/\\/g, '/') // fix path separator for windows
const dataPath = `${rootPath}/data`
const codaJsonPath = `${dataPath}/coda.json`
const codaDocsPath = `${dataPath}/docs`

export class MoverServer {
  readonly tasks = new TaskEmitter({
    concurrency: 1,
    onItemError: (item, error) => {
      if (isAxiosError(error)) {
        console.error(
          '[mover]',
          item.id,
          'request error',
          error.response?.status,
          error.response?.data,
        )
      } else {
        console.error('[mover]', item.id, 'error', error)
      }

      this.notifyStatus(item.id!, 'error', error.message)
    },
    onItemDone: item => {
      this.notifyStatus(item.id!, 'done')
    },
  })

  private _socket: Socket | undefined
  items: Record<string, ICodaItem> = {}

  get socket (): Socket {
    if (!this._socket) {
      throw Error('[mover] socket needs to be provided using \'handleClientRequests\'')
    }

    return this._socket
  }

  async handleClientRequests (socket: Socket) {
    // ensure old listeners detached when replacing socket
    if (this._socket) this._socket.removeAllListeners()
    this._socket = socket

    try {
      await this.loadPreviouslySyncedData()

      this.handleClientSyncDocs()
    } catch (err: any) {
      console.error('[mover] handle requests', err)
      this.notifyStatus('handle requests', 'error', err.message as string)
    }
  }

  async loadPreviouslySyncedData () {
    // ensure folder structure for saving data
    await ensureDir(codaDocsPath)

    const codaJsonPathExists = await pathExists(codaJsonPath)
    if (!codaJsonPathExists) return
    // attempt loading previously synced data
    const items: ICodaItems = await readJson(codaJsonPath)

    this.items = items.reduce<Record<string, ICodaItem>>((indexedItems, item) => {
      indexedItems[item.id] = item

      return indexedItems
    }, {})
  }

  handleClientSyncDocs () {
    this.socket.on(CLIENT_SYNC_DOCS, async (apiToken: string) => {
      let docListingRes = await CodaApis.listDocs(apiToken)

      await this.processApiDocs(docListingRes.items, apiToken)

      while (docListingRes.nextPageToken) {
        docListingRes = await CodaApis.listDocs(apiToken, docListingRes.nextPageToken)
        await this.processApiDocs(docListingRes.items, apiToken)
      }

      this.notifyStatus(CLIENT_SYNC_DOCS, 'done')
      this.queuePersistingData()
    })
  }

  async processApiDocs (apiDocs: ICodaApiDoc[], apiToken: string) {
    const docs: ICodaDoc[] = apiDocs.map(doc => ({
      id: doc.id,
      name: doc.name,
      treePath: '/',
    }))

    // return docs
    this.socket.emit(SERVER_RETURN_DOCS, docs)

    // return synced pages of returned docs
    const returnedDocIds = docs.map(doc => doc.id)
    // example returned doc ids are a,b,c the pattern should be /^(a|b|c)/
    const returnedDocIdsRegex = new RegExp(`^/(${returnedDocIds.join('|')})/`)
    const innerPagesOfReturnedDocs = Object.values(this.items)
      .filter(item => returnedDocIdsRegex.test(item.treePath))

    this.socket.emit(SERVER_RETURN_PAGES, innerPagesOfReturnedDocs)

    docs.forEach((doc, idx) => {
      this.tasks.add({
        id: doc.id,
        context: {},
        execute: async () => await this.queueProcessDocOnFilesystem(doc, apiDocs[idx].updatedAt),
        priority: TaskPriority.HIGH,
      })

      this.tasks.add({
        id: doc.id,
        context: {},
        execute: async () => await this.queueListPagesPerDoc(doc, apiToken),
      })
    })

    this.tasks.next()
  }

  async queueProcessDocOnFilesystem (doc: ICodaDoc, updatedAt: string) {
    const restoredDoc = this.items[doc.id]
    const docFilePath = `${codaDocsPath}/${doc.name.replace(/\//g, ' ')}`
    const syncedDoc = {
      id: doc.id,
      name: doc.name,
      treePath: '/',
      syncedAt: this.getCurrentIsoDateTime(),
      filePath: docFilePath,
    }

    if (!restoredDoc?.filePath) { // save new doc
      this.notifyStatus(doc.id, 'saving')
    } else if (restoredDoc.syncedAt && restoredDoc.syncedAt < updatedAt) { // doc outdated
      await this.revalidateSyncedDoc(restoredDoc, syncedDoc)
    }

    this.items[doc.id] = syncedDoc
    await ensureDir(syncedDoc.filePath)
  }

  async revalidateSyncedDoc (restoredDoc: ICodaDoc, updatedDoc: ICodaDoc) {
    const restoredFilePath = restoredDoc.filePath
    const newFilePath = updatedDoc.filePath
    if (!restoredFilePath || !newFilePath) return
    if (restoredFilePath === newFilePath) return

    // update inner pages filePath
    Object.values(this.items).forEach(item => {
      const filePath = item.filePath

      if (!item.treePath.startsWith(`/${restoredDoc.name}/`)) return // not inner page
      if (!filePath) return // inner page not synced
      this.items[item.id].filePath = filePath.replace(restoredFilePath, newFilePath)
    })

    const syncedPathExists = await pathExists(restoredFilePath)
    if (syncedPathExists) {
      await rename(restoredFilePath, newFilePath)
    }
  }

  async queueListPagesPerDoc (doc: ICodaDoc, apiToken: string) {
    const docId = doc.id

    this.notifyStatus(docId, 'listing')
    let pageListingRes = await CodaApis.listPagesForDoc(apiToken, docId)

    await this.processApiPages(doc, pageListingRes.items, apiToken)

    while (pageListingRes.nextPageToken) {
      pageListingRes = await CodaApis.listPagesForDoc(apiToken, docId, pageListingRes.nextPageToken)

      await this.processApiPages(doc, pageListingRes.items, apiToken)
    }

    this.notifyStatus(docId, 'done')
  }

  async processApiPages (doc: ICodaDoc, apiPages: ICodaApiPage[], apiToken: string) {
    const pages = apiPages.map((page, idx) => {
      const parentId = page.parent?.id
      let parent = doc

      if (parentId && this.items[parentId]) {
        parent = this.items[parentId]
      }

      const treePath = `${parent.treePath}${parent.id}/`
      const syncedPage = {
        id: page.id,
        name: page.name,
        treePath,
      }

      this.items[page.id] = {
        ...this.items[page.id],
        ...syncedPage,
      }

      // allow canvas pages can be exported from Coda
      if (page.contentType === 'canvas') {
        this.tasks.add({
          id: doc.id,
          context: {},
          execute: async () => await this.queueProcessPageOnFilesystem(
            apiToken,
            doc,
            this.items[page.id],
            apiPages[idx].updatedAt,
          ),
          priority: TaskPriority.HIGH,
        })
      }

      return this.items[page.id]
    })

    // return page updates or new pages
    this.socket.emit(SERVER_RETURN_PAGES, pages)
  }

  async queueProcessPageOnFilesystem (apiToken: string, doc: ICodaDoc, page: ICodaPage, updatedAt: string, exportId?: string) {
    const parentId = page.treePath.replace(/\/$/, '').split('/').pop()
    const parent = parentId && this.items[parentId]
    if (!parent) throw Error('[process page] parent not found')
    if (!parent.filePath) throw Error('[process page] parent not synced yet')

    const parentDir = parent.filePath.replace(/(\/|\.[^.]+)$/, '')
    const pageFilePath = `${parentDir}/${page.name.replace(/\//g, ' ')}.html`
    const isDocOutdated = page.syncedAt && page.syncedAt < updatedAt
    const isPathChanged = pageFilePath !== page.filePath
    const isDocSyncedToFilesystem = page.filePath && await pathExists(page.filePath)

    if (isDocSyncedToFilesystem && !isDocOutdated && !isPathChanged) return // nothing changed

    this.notifyStatus(page.id, 'saving')
    const syncedPage = {
      ...page,
      filePath: pageFilePath,
    }

    this.items[page.id] = syncedPage

    if (!exportId) {
      const exportRes = await CodaApis.exportPage(apiToken, doc.id, page.id)

      exportId = exportRes.id
    }

    if (!exportId) throw Error('[process page] export id is required')

    const pageExport = await CodaApis.getPageExport(apiToken, doc.id, page.id, exportId)

    if (!pageExport.downloadLink) { // retry later
      this.tasks.add({
        id: page.id,
        context: {},
        execute: async () => await this.queueProcessPageOnFilesystem(apiToken, doc, page, updatedAt, exportId),
        priority: TaskPriority.LOW,
      })

      return
    }

    this.items[page.id].syncedAt = this.getCurrentIsoDateTime()

    await ensureDir(parentDir)
    await download(pageExport.downloadLink, createWriteStream(syncedPage.filePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.notifyStatus(page.id, 'done')
  }

  queuePersistingData () {
    this.tasks.add({
      id: 'persist coda.json',
      context: {},
      execute: async () => {
        await writeJson(codaJsonPath, Object.values(this.items))
      },
      priority: TaskPriority.IDLE,
    })
  }

  private notifyStatus (item: string, status: string, message?: string) {
    this.socket.emit(ITEM_STATUS, { id: item, status, message })
  }

  private getCurrentIsoDateTime () {
    return (new Date()).toISOString()
  }
}
