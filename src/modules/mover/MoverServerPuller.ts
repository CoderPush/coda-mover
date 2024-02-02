import { createWriteStream, ensureDir, pathExists, readJson, rename, writeJson } from 'fs-extra'
import { CLIENT_SYNC_DOCS, SERVER_RETURN_DOCS, SERVER_RETURN_PAGES } from './events'
import type { ICodaApiDoc, ICodaApiPage, ICodaDoc, ICodaItem, ICodaPage, IPuller, ICodaItems, IMoverServer } from './interfaces'
import { resolve } from 'path'
import { TaskPriority } from '@abxvn/tasks'
import type { ICodaApis } from './apis/interfaces'
import { download } from './apis'

const rootPath = resolve(__dirname, '../../../../').replace(/\\/g, '/') // fix path separator for windows
const dataPath = `${rootPath}/data`
const codaJsonPath = `${dataPath}/coda.json`
const codaDocsPath = `${dataPath}/docs`

export class MoverServerPuller implements IPuller {
  private _exportingCount = 0
  private _items: Record<string, ICodaItem> = {}

  constructor (
    private readonly server: IMoverServer,
    private readonly apis: ICodaApis,
  ) {}

  get items (): Record<string, ICodaItem> {
    return this._items
  }

  async loadSyncedData () {
    // ensure folder structure for saving data
    await ensureDir(codaDocsPath)

    const codaJsonPathExists = await pathExists(codaJsonPath)
    if (!codaJsonPathExists) return
    // attempt loading previously synced data
    const items: ICodaItems = await readJson(codaJsonPath)

    this._items = items.reduce<Record<string, ICodaItem>>((indexedItems, item) => {
      indexedItems[item.id] = item

      return indexedItems
    }, {})
  }

  returnDocs (docs: ICodaDoc[]) {
    this.server.emit(SERVER_RETURN_DOCS, docs)
  }

  returnPages (pages: ICodaPage[]) {
    this.server.emit(SERVER_RETURN_PAGES, pages)
  }

  async syncDocs () {
    try {
      this.server.notifyStatus(CLIENT_SYNC_DOCS, 'listing')
      await this.loadSyncedData()

      let docListingRes = await this.apis.listDocs()

      await this.processApiDocs(docListingRes.items)

      while (docListingRes.nextPageToken) {
        docListingRes = await this.apis.listDocs(docListingRes.nextPageToken)
        await this.processApiDocs(docListingRes.items)
      }

      this.server.notifyStatus(CLIENT_SYNC_DOCS, 'done')
      this.server.queue('save coda.json', async () => await this.saveData(), TaskPriority.IDLE)
    } catch (err: any) {
      this.server.logError(err, CLIENT_SYNC_DOCS)
    }
  }

  private async processApiDocs (apiDocs: ICodaApiDoc[]) {
    const docs: ICodaDoc[] = apiDocs.map(doc => ({
      id: doc.id,
      name: doc.name,
      treePath: '/',
    }))

    // return docs
    this.returnDocs(docs)

    // return synced pages of returned docs
    const returnedDocIds = docs.map(doc => doc.id)
    // example returned doc ids are a,b,c the pattern should be /^(a|b|c)/
    const returnedDocIdsRegex = new RegExp(`^/(${returnedDocIds.join('|')})/`)
    const innerPagesOfReturnedDocs = Object.values(this.items)
      .filter(item => returnedDocIdsRegex.test(item.treePath))

    this.returnPages(innerPagesOfReturnedDocs)

    docs.forEach((doc, idx) => {
      this.server.queue(doc.id, async () => await this.saveDoc(doc, apiDocs[idx].updatedAt))
      this.server.queue(doc.id, async () => await this.listPagesForDoc(doc))
    })
  }

  async saveDoc (doc: ICodaDoc, updatedAt: string) {
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
      this.server.notifyStatus(doc.id, 'saving')
    } else if (restoredDoc.syncedAt && restoredDoc.syncedAt < updatedAt) { // doc outdated
      await this.revalidateDoc(restoredDoc, syncedDoc)
    }

    this.items[doc.id] = syncedDoc
    await ensureDir(syncedDoc.filePath)
  }

  async revalidateDoc (restoredDoc: ICodaDoc, updatedDoc: ICodaDoc) {
    this.server.notifyStatus(updatedDoc.id, 'validating')

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

  async listPagesForDoc (doc: ICodaDoc) {
    const docId = doc.id

    this.server.notifyStatus(docId, 'listing')
    let pageListingRes = await this.apis.listPagesForDoc(docId)

    await this.processApiPages(doc, pageListingRes.items)

    while (pageListingRes.nextPageToken) {
      pageListingRes = await this.apis.listPagesForDoc(docId, pageListingRes.nextPageToken)

      await this.processApiPages(doc, pageListingRes.items)
    }

    this.server.notifyStatus(docId, 'done')
  }

  private async processApiPages (doc: ICodaDoc, apiPages: ICodaApiPage[]) {
    const pages = apiPages.map((page, idx) => {
      const parentId = page.parent?.id
      let parent = doc

      if (parentId && this.items[parentId]) {
        parent = this.items[parentId]
      }

      const treePath = `${parent.treePath}${parent.id}/`
      const syncedPage = {
        ...this.items[page.id],
        id: page.id,
        name: page.name,
        treePath,
      }

      // allow canvas pages can be exported from Coda
      if (page.contentType === 'canvas') {
        this.items[page.id] = syncedPage
        this.server.queue(
          page.id,
          async () => await this.revalidateAndSavePage(
            doc,
            syncedPage,
            apiPages[idx].updatedAt,
          )
        )

        return syncedPage
      } else {
        // remove non canvas pages
        delete this.items[page.id] // eslint-disable-line @typescript-eslint/no-dynamic-delete

        return null
      }
    }).filter(Boolean) as ICodaPage[]

    // return page updates or new pages
    this.returnPages(pages)
    this.server.queue('save coda.json', async () => await this.saveData())
  }

  async revalidateAndSavePage (doc: ICodaDoc, page: ICodaPage, updatedAt: string, exportId?: string) {
    const parentId = page.treePath.replace(/\/$/, '').split('/').pop()
    const parent = parentId && this.items[parentId]
    if (!parent) throw Error(`[save page] parent ${parentId} not found`)
    if (!parent.filePath) throw Error('[save page] parent not synced yet')

    const parentDir = parent.filePath.replace(/(\/|\.[^.]+)$/, '')
    const pageFilePath = `${parentDir}/${page.name.replace(/\//g, ' ')}.html`
    const isDocOutdated = page.syncedAt && page.syncedAt < updatedAt
    const isPathChanged = pageFilePath !== page.filePath
    const isDocSyncedToFilesystem = page.filePath && await pathExists(page.filePath)

    if (isDocSyncedToFilesystem && !isDocOutdated && !isPathChanged) return // nothing changed

    this.server.notifyStatus(page.id, 'saving')
    const syncedPage = {
      ...page,
      filePath: pageFilePath,
    }

    this.items[page.id] = syncedPage

    if (!exportId) {
      // try to minimize rate of 429 errors
      // which mostly happens when exporting pages
      await this.wait(this._exportingCount * 1000)

      this._exportingCount++

      const exportRes = await this.apis.exportPage(doc.id, page.id)

      this._exportingCount--

      exportId = exportRes.id
    }

    if (!exportId) throw Error('[save page] export id is required')

    const pageExport = await this.apis.getPageExport(doc.id, page.id, exportId)

    if (!pageExport.downloadLink) { // retry later at low priority
      this.server.queue(
        page.id,
        async () => await this.revalidateAndSavePage(doc, page, updatedAt, exportId),
        TaskPriority.LOW,
      )

      return
    }

    this.items[page.id].syncedAt = this.getCurrentIsoDateTime()

    await ensureDir(parentDir)
    await download(pageExport.downloadLink, createWriteStream(syncedPage.filePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.server.notifyStatus(page.id, 'done')
  }

  async saveData () {
    await ensureDir(dataPath)
    await writeJson(codaJsonPath, Object.values(this.items))
  }

  private getCurrentIsoDateTime () {
    return (new Date()).toISOString()
  }

  private async wait (ms: number) {
    return await new Promise(resolve => setTimeout(resolve, ms))
  }
}
