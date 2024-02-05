import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import type { ICodaApis, ICodaPage, IMover, IExporter, IStatus } from '../interfaces'
import { createWriteStream, ensureDir } from 'fs-extra'
import { getCurrentIsoDateTime, getParentDir, logError, trimSlashes } from '../lib/helpers'
import { download } from '../../mover/apis'

export class CodaExporter implements IExporter {
  private readonly tasks = new TaskEmitter({
    concurrency: 1,
    onItemError: (item, error) => {
      const isRateLimitError = isAxiosError(error) && error.response?.status === 429
      if (isRateLimitError) this.tasks.add({ ...item, priority: TaskPriority.LOW })

      logError(error, item.id)
      this.setStatus(item.id!, 'error', error.message)
    },
    onItemDone: item => {
      this.setStatus(item.id!, 'done')
    },
  })

  constructor (
    private readonly mover: IMover,
    private readonly apis: ICodaApis
  ) {}

  queuePageExport (page: ICodaPage) {
    this.tasks.add({ id: page.id, execute: async () => await this.exportPage(page) })
  }

  async exportPage (page: ICodaPage, exportId?: string) {
    const docId = trimSlashes(page.treePath).split('/').pop()
    if (!docId) throw Error(`[${page.id}] export doc id not found`)

    const parentDir = getParentDir(page, this.items)
    const pageFilePath = `${parentDir}/${page.name.replace(/\//g, ' ')}.html`

    if (!exportId) {
      this.setStatus(page.id, 'exporting')
      const exportRes = await this.apis.exportPage(docId, page.id)

      exportId = exportRes.id
    }

    if (!exportId) throw Error(`[${page.id}] export id is required`)

    const pageExport = await this.apis.getPageExport(docId, page.id, exportId)

    if (!pageExport.downloadLink) { // retry later at low priority
      this.tasks.add({
        id: page.id,
        execute: async () => await this.exportPage(page, exportId),
        priority: TaskPriority.LOW,
      })

      return
    }

    this.setStatus(page.id, 'downloading')
    this.items[page.id].syncedAt = getCurrentIsoDateTime()

    await ensureDir(parentDir)
    await download(pageExport.downloadLink, createWriteStream(pageFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    const syncedPage = { ...page, filePath: pageFilePath }

    this.setStatus(page.id, 'done')
    this.items[page.id] = syncedPage
  }

  stopPendingExports () {
    this.tasks.dispose()
  }

  private setStatus (id: string, status: IStatus, message?: string) {
    this.mover.setStatus(`export:${id}`, status, message)
  }

  get items () {
    return this.mover.items
  }
}
