import { ensureDir, writeJson } from 'fs-extra'
import type { ICodaApis, ICodaItem, IMover, IServer, IItemStatus, ICodaApiDoc, IStatus, ICodaApiPage } from './interfaces'
import { codaDocsPath, itemsJsonPath } from './lib'
import { CLIENT_LIST_DOCS, ITEM_STATUS_DONE, ITEM_STATUS_ERROR, ITEM_STATUS_LISTING, ITEM_STATUS_PENDING, SERVER_RETURN_DOCS, SERVER_RETURN_STATUS, SERVER_SAVE_ITEMS } from './events'
import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'

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

  get items (): Record<string, ICodaItem> {
    return this._items
  }

  constructor (
    private readonly server: IServer,
    private readonly codaApis: ICodaApis,
  ) {}

  listDocs () {
    this.setStatus(CLIENT_LIST_DOCS, ITEM_STATUS_PENDING)

    this.tasks.add({
      id: CLIENT_LIST_DOCS,
      execute: async () => await this.queueListingDocs(),
      priority: TaskPriority.INSTANT,
    })

    this.tasks.add({
      id: SERVER_SAVE_ITEMS,
      execute: async () => await this.saveItems(),
      priority: TaskPriority.IDLE,
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
    this.setStatus(docId, ITEM_STATUS_PENDING)

    this.tasks.add({
      id: `list:${docId}`,
      execute: async () => await this.queueListingPages(docId),
      priority: TaskPriority.HIGH,
    })

    this.tasks.next()
  }

  async queueListingPages (docId: string, pageToken?: string) {
    await ensureDir(codaDocsPath)
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

      const page = {
        ...this._items[apiPage.id],
        id: apiPage.id,
        name: apiPage.name,
        treePath: `${parent.treePath}${parent.name}/`,
      }

      this._items[page.id] = page

      // TODO: queue exporting pages
    })
  }

  async saveItems () {
    await writeJson(itemsJsonPath, Object.values(this._items))
  }

  setStatus (id: string, status: IStatus, message?: string) {
    const itemStatus = { id, status, message }

    this._itemStatuses[id] = itemStatus
    console.log(`[mover] ${id}`, status)
    this.server.emit(SERVER_RETURN_STATUS, itemStatus)
  }

  getStatus (id: string) {
    return this._itemStatuses[id].status || ''
  }
}
