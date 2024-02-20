import { ensureDir, pathExists, pathExistsSync, readJson, writeJson } from 'fs-extra'
import type {
  ICodaApis,
  ICodaItem,
  IMover,
  IServer,
  IItemStatus,
  ICodaApiDoc,
  IStatus,
  ICodaApiPage,
  IExporter,
  ICodaDoc,
  IImporter,
} from './interfaces'
import { codaDocsPath, itemsJsonPath, log } from './lib'
import {
  CLIENT_IMPORT_OUTLINE,
  CLIENT_LIST_DOCS,
  ITEM_STATUS_DONE,
  ITEM_STATUS_DOWNLOADING,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_EXPORTING,
  ITEM_STATUS_LISTING,
  ITEM_STATUS_PENDING,
  SERVER_LOAD_ITEMS,
  SERVER_RETURN_DOCS,
  SERVER_RETURN_STATUS,
  SERVER_IMPORT_RETURN_ISSUES,
  ITEM_STATUS_IMPORTING,
} from './events'
import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import { CodaExporter } from './transfers/CodaExporter'
import { OutlineImporter } from './transfers/OutlineImporter'
import { OutlineApis } from './apis/OutlineApis'

export class Mover implements IMover {
  private readonly _items: Record<string, ICodaItem> = {}
  private readonly _itemStatuses: Record<string, IItemStatus> = {}
  private readonly tasks = new TaskEmitter({
    concurrency: 5,
    onItemError: (item, error) => {
      const isRateLimitError = isAxiosError(error) && error.response?.status === 429
      if (isRateLimitError) {
        this.tasks.add({ ...item, priority: TaskPriority.LOW })
        this.tasks.next()
      }

      this.setStatus(item.id!, ITEM_STATUS_ERROR, error.message)
    },
  })

  private _exporter: IExporter | undefined
  private _importer: IImporter | undefined

  constructor (
    private readonly server: IServer,
    private readonly codaApis: ICodaApis,
  ) {}

  get items (): Record<string, ICodaItem> {
    return this._items
  }

  get itemStatuses (): Record<string, IItemStatus> {
    return this._itemStatuses
  }

  get exporter (): IExporter {
    if (!this._exporter) this._exporter = new CodaExporter(this, this.codaApis)

    return this._exporter
  }

  listDocs () {
    this.setStatus(CLIENT_LIST_DOCS, ITEM_STATUS_PENDING)

    this.tasks.add({
      id: SERVER_LOAD_ITEMS,
      execute: async () => {
        await this.loadItems()

        this.tasks.add({
          id: CLIENT_LIST_DOCS,
          execute: async () => await this.queueListingDocs(),
          priority: TaskPriority.INSTANT,
        })
      },
      priority: TaskPriority.INSTANT,
    })

    this.tasks.next()
  }

  async queueListingDocs (pageToken?: string) {
    this.setStatus(CLIENT_LIST_DOCS, ITEM_STATUS_LISTING)

    const docListingRes = await this.codaApis.listDocs(pageToken)

    this.receiveDocs(docListingRes.items)
    if (docListingRes.nextPageToken) {
      this.tasks.add({
        id: CLIENT_LIST_DOCS,
        execute: async () => await this.queueListingDocs(docListingRes.nextPageToken),
        priority: TaskPriority.INSTANT,
      })
    } else {
      this.setStatus(CLIENT_LIST_DOCS, ITEM_STATUS_DONE)
    }
  }

  private receiveDocs (apiDocs: ICodaApiDoc[]) {
    const docs = apiDocs.map(apiDoc => {
      const doc: ICodaDoc = {
        ...this._items[apiDoc.id],
        id: apiDoc.id,
        name: apiDoc.name,
        treePath: '/',
        browserLink: apiDoc.browserLink,
        ownerName: apiDoc.ownerName,
        ownerEmail: apiDoc.owner,
        folderName: apiDoc.folder.name || '',
        folderBrowserLink: apiDoc.folder.browserLink,
      }

      this._items[doc.id] = doc

      return doc
    })

    this.server.emit(SERVER_RETURN_DOCS, docs)
  }

  listPages (docId: string) {
    const doc = this._items[docId]
    if (!doc) throw Error(`[${docId}] doc not found`)

    this.setStatus(docId, ITEM_STATUS_PENDING)

    this.tasks.add({
      id: `list:${docId}`,
      execute: async () => {
        await ensureDir(`${codaDocsPath}/${doc.name}`)
        await this.queueListingPages(docId)
      },
      priority: TaskPriority.HIGH,
    })

    this.tasks.next()
  }

  async queueListingPages (docId: string, pageToken?: string) {
    this.setStatus(docId, ITEM_STATUS_LISTING)

    const pageListingRes = await this.codaApis.listPagesForDoc(docId, pageToken)

    this.receivePages(docId, pageListingRes.items)
    if (pageListingRes.nextPageToken) {
      this.tasks.add({
        id: docId,
        execute: async () => await this.queueListingPages(docId, pageListingRes.nextPageToken),
        priority: TaskPriority.HIGH,
      })
    } else {
      this.setStatus(docId, ITEM_STATUS_DONE)
    }
  }

  private receivePages (docId: string, apiPages: ICodaApiPage[]) {
    apiPages.forEach(apiPage => {
      const parentId = apiPage.parent?.id || docId
      const parent = this._items[parentId]
      if (!parent) throw Error(`[${apiPage.id}] parent not found`)
      if (apiPage.contentType !== 'canvas') return // only `canvas` type pages are exportable

      const page = {
        ...this._items[apiPage.id],
        id: apiPage.id,
        name: apiPage.name,
        treePath: `${parent.treePath}${parent.id}/`,
      }

      this._items[page.id] = page

      // Only sync page to disk if page is out of sync
      if (!page.syncedAt || !page.filePath) {
        this.exporter.queuePageExport(page)
      } else if (page.syncedAt < apiPage.updatedAt || page.syncedAt < apiPage.createdAt) {
        this.exporter.queuePageExport(page)
      } else if (!pathExistsSync(page.filePath)) {
        this.exporter.queuePageExport(page)
      } else {
        this.setStatus(page.id, ITEM_STATUS_DONE)
      }
    })
  }

  async requestImportOutline (outlineApiToken: string, items: ICodaItem[]) {
    this.cancelExports()

    const docs = items.filter(item => item.treePath === '/') as ICodaDoc[]

    // queue listing and exporting pages in background
    docs.forEach(doc => {
      this.listPages(doc.id)
    })

    this._importer = new OutlineImporter(
      this,
      new OutlineApis(outlineApiToken),
      docs,
    )

    await this._importer.validateImport()
  }

  returnImportIssues (...issues: string[]) {
    this.server.emit(SERVER_IMPORT_RETURN_ISSUES, issues)
  }

  async confirmImport () {
    try {
      if (!this._importer) throw Error('Import should be requested first')

      await this._importer.confirmImport()
    } catch (err: any) {
      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_ERROR, err.message as string)
    }
  }

  cancelImports () {
    this.cancelExports()
    if (this._importer) {
      log.info('[mover] cancel imports')
      this._importer.stopPendingImports()
      this._importer = undefined
    }
  }

  async saveItems () {
    await writeJson(itemsJsonPath, Object.values(this._items))
    log.info('[mover] items saved')
  }

  async loadItems () {
    if (!await pathExists(itemsJsonPath)) return

    const items: ICodaItem[] = await readJson(itemsJsonPath)

    items.forEach(item => {
      this._items[item.id] = item
    })

    log.info('[mover] items loaded')
  }

  setStatus (id: string, status: IStatus, message?: string) {
    const itemStatus = { id, status, message }

    this._itemStatuses[id] = itemStatus
    if (status === ITEM_STATUS_ERROR) {
      log.error(`[mover] ${id}`, status, message)
    } else if (message) {
      log.info(`[mover] ${id}`, status, message)
    } else {
      log.info(`[mover] ${id}`, status)
    }

    /**
     * Just so importer can wait for exporter to complete downloading a doc or page before importing it
     * This is considered as a temporary solution
     */
    if (status === ITEM_STATUS_DONE && this._importer && this.items[id]) {
      this._importer.onItemExported(this.items[id])
    }

    const ignoredClientNotifiedStatuses = [
      ITEM_STATUS_EXPORTING,
      ITEM_STATUS_PENDING,
      ITEM_STATUS_DOWNLOADING,
    ]
    const isStatusIgnored = ignoredClientNotifiedStatuses.includes(status)
    const isImportingItem = status === ITEM_STATUS_IMPORTING && id.includes('import::')
    if (!isStatusIgnored && !isImportingItem) {
      this.server.emit(SERVER_RETURN_STATUS, itemStatus)
    }
  }

  getStatus (id: string) {
    return this._itemStatuses[id].status || ''
  }

  private cancelExports () {
    if (this._exporter) {
      log.info('[mover] cancel exports')
      this._exporter.stopPendingExports()
      this._exporter = undefined
    }
  }

  dispose () {
    this.tasks.dispose()
    this.cancelImports()
  }
}
