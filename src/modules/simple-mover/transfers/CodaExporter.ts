import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import type { ICodaApis, ICodaPage, IMover, IExporter, IStatus } from '../interfaces'
import { createWriteStream, ensureDir } from 'fs-extra'
import { getCurrentIsoDateTime, getParentDir, trimSlashes } from '../lib/helpers'
import { download } from '../../mover/apis'
import { ITEM_STATUS_DONE, ITEM_STATUS_DOWNLOADING, ITEM_STATUS_ERROR, ITEM_STATUS_EXPORTING, ITEM_STATUS_PENDING, SERVER_SAVE_ITEMS } from '../events'

export class CodaExporter implements IExporter {
  private importChunkCounter = 0
  private readonly tasks = new TaskEmitter({
    concurrency: 1,
    onItemError: (item, error) => {
      const isRateLimitError = isAxiosError(error) && error.response?.status === 429
      if (isRateLimitError) {
        this.tasks.add({ ...item, priority: TaskPriority.LOW })
        this.tasks.next()
      }

      this.setStatus(item.id!, ITEM_STATUS_ERROR, error.message)
    },
    onItemDone: (item) => {
      if (item.id === SERVER_SAVE_ITEMS || !item.id) return
      if (this.mover.itemStatuses[item.id].status !== ITEM_STATUS_DONE) return

      this.importChunkCounter++
      if (this.importChunkCounter >= 6 || (this.tasks.pendingCount + this.tasks.runningCount) <= 1) {
        this.importChunkCounter = 0
        this.tasks.add({
          id: SERVER_SAVE_ITEMS,
          execute: async () => await this.mover.saveItems(),
        })
        this.tasks.next()
      }
    },
  })

  constructor (
    private readonly mover: IMover,
    private readonly apis: ICodaApis
  ) {}

  queuePageExport (page: ICodaPage) {
    this.setStatus(page.id, ITEM_STATUS_PENDING)

    this.tasks.start()
    this.tasks.add({ id: page.id, execute: async () => await this.exportPage(page) })
    this.tasks.next()
  }

  async exportPage (page: ICodaPage, exportId?: string) {
    const docId = trimSlashes(page.treePath).split('/').shift()
    if (!docId) throw Error('invalid page tree path')

    const parentDir = getParentDir(page, this.items)
    const pageFilePath = `${parentDir}/${page.name.replace(/\//g, ' ')}.html`

    if (!exportId) {
      this.setStatus(page.id, ITEM_STATUS_EXPORTING)
      const exportRes = await this.apis.exportPage(docId, page.id)

      exportId = exportRes.id
    }

    if (!exportId) throw Error('export isn\'t requested')

    const pageExport = await this.apis.getPageExport(docId, page.id, exportId)

    if (!pageExport.downloadLink) { // retry later at low priority
      this.tasks.add({
        id: page.id,
        execute: async () => await this.exportPage(page, exportId),
        priority: TaskPriority.LOW,
      })

      return
    }

    this.setStatus(page.id, ITEM_STATUS_DOWNLOADING)
    this.items[page.id].syncedAt = getCurrentIsoDateTime()

    await ensureDir(parentDir)
    await download(pageExport.downloadLink, createWriteStream(pageFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.items[page.id].filePath = pageFilePath
    this.setStatus(page.id, ITEM_STATUS_DONE)
  }

  stopPendingExports () {
    this.tasks.dispose()
  }

  private setStatus (id: string, status: IStatus, message?: string) {
    this.mover.setStatus(id, status, message)
  }

  get items () {
    return this.mover.items
  }
}
