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
} from './interfaces'
import { codaDocsPath, itemsJsonPath } from './lib'
import {
  CLIENT_LIST_DOCS,
  ITEM_STATUS_DONE,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_LISTING,
  ITEM_STATUS_PENDING,
  SERVER_LOAD_ITEMS,
  SERVER_RETURN_DOCS,
  SERVER_RETURN_STATUS,
  SERVER_SAVE_ITEMS,
} from './events'
import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import { CodaExporter } from './transfers/CodaExporter'

export class Mover implements IMover {
  private readonly _items: Record<string, ICodaItem> = {}
  private readonly _itemStatuses: Record<string, IItemStatus> = {}
  private readonly tasks = new TaskEmitter({
    concurrency: 5,
    onItemError: (item, error) => {
      const isRateLimitError = isAxiosError(error) && error.response?.status === 429
      if (isRateLimitError) this.tasks.add({ ...item, priority: TaskPriority.LOW })

      this.setStatus(item.id!, ITEM_STATUS_ERROR, error.message)
    },
  })

  private _exporter: IExporter | undefined

  constructor (
    private readonly server: IServer,
    private readonly codaApis: ICodaApis,
  ) {}

  get items (): Record<string, ICodaItem> {
    return this._items
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
      this.tasks.add({
        id: SERVER_SAVE_ITEMS,
        execute: async () => await this.saveItems(),
        priority: TaskPriority.IDLE,
      })
    }
  }

  private receiveDocs (apiDocs: ICodaApiDoc[]) {
    const docs = apiDocs.map(apiDoc => {
      const doc = {
        ...this._items[apiDoc.id],
        id: apiDoc.id,
        name: apiDoc.name,
        treePath: '/',
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
      this.tasks.add({
        id: SERVER_SAVE_ITEMS,
        execute: async () => await this.saveItems(),
        priority: TaskPriority.IDLE,
      })
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
      }
    })
  }

  requestImportOutline (outlineApiToken: string, items: ICodaItem[]) {
    this.cancelExports()
    const docs = items.filter(item => item.treePath === '/') as ICodaDoc[]

    docs.forEach(doc => {
      this.listPages(doc.id)
    })
  }

  cancelImports () {
    this.cancelExports()
  }

  async saveItems () {
    await writeJson(itemsJsonPath, Object.values(this._items))
    console.info('[mover] items saved')
  }

  async loadItems () {
    if (!await pathExists(itemsJsonPath)) return

    const items: ICodaItem[] = await readJson(itemsJsonPath)

    items.forEach(item => {
      this._items[item.id] = item
    })

    console.info('[mover] items loaded')
  }

  setStatus (id: string, status: IStatus, message?: string) {
    const itemStatus = { id, status, message }

    this._itemStatuses[id] = itemStatus
    if (status === ITEM_STATUS_ERROR) {
      console.error(`[mover] ${id}`, status, message)
    } else {
      console.info(`[mover] ${id}`, status)
    }

    this.server.emit(SERVER_RETURN_STATUS, itemStatus)
  }

  getStatus (id: string) {
    return this._itemStatuses[id].status || ''
  }

  cancelExports () {
    if (this._exporter) {
      this._exporter.stopPendingExports()
      this._exporter = undefined
    }
  }

  dispose () {
    this.tasks.dispose()
    this.cancelImports()
  }
}
