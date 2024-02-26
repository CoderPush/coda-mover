import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import type { ICodaApis, ICodaPage, IMover, IExporter, IStatus } from '../interfaces'
import { createWriteStream, ensureDir, readFile, writeFile } from 'fs-extra'
import { getCurrentIsoDateTime, getParentDir, trimSlashes } from '../lib'
import { download } from '../apis'
import {
  ITEM_STATUS_DONE,
  ITEM_STATUS_DOWNLOADING,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_EXPORTING,
  ITEM_STATUS_PENDING,
  SERVER_SAVE_ITEMS,
  ITEM_STATUS_FETCHING_IMAGES,
  ITEM_STATUS_REPLACING_IMAGES,
  ITEM_STATUS_DOWNLOADING_IMAGES,
} from '../events'
import { dirname } from 'path'

const CODA_IMAGE_REPLACEMENT_REGEX = /^\n{2}|\n{3}/g

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

  async exportPage (page: ICodaPage, exportId?: string, imageExportId?: string) {
    const docId = trimSlashes(page.treePath).split('/').shift()
    if (!docId) throw Error('invalid page tree path')

    const parentDir = getParentDir(page, this.items)
    const pageFilePath = `${parentDir}/${page.name.replace(/\//g, ' ')}.md`

    if (!exportId) exportId = await this.exportPageAsMarkdown(docId, page)
    if (!exportId) throw Error('markdown export isn\'t requested')
    if (!imageExportId) await this.downloadMarkdownExport(docId, page, pageFilePath, exportId)

    const markdownContent = await readFile(pageFilePath, 'utf8')
    const shouldAddImages = CODA_IMAGE_REPLACEMENT_REGEX.test(markdownContent)

    if (shouldAddImages) {
      if (!imageExportId) imageExportId = await this.exportPageAsHtml(docId, page)
      if (!imageExportId) throw Error('html images export isn\'t requested')

      await this.downloadImageExportAndReplaceInMarkdown(
        docId,
        page,
        pageFilePath,
        markdownContent,
        exportId,
        imageExportId,
      )
    }

    this.setStatus(page.id, ITEM_STATUS_DONE)
  }

  private async exportPageAsMarkdown (docId: string, page: ICodaPage) {
    this.setStatus(page.id, ITEM_STATUS_EXPORTING)
    const exportRes = await this.apis.exportPage(docId, page.id, 'markdown')

    return exportRes.id
  }

  private async downloadMarkdownExport (
    docId: string,
    page: ICodaPage,
    pageFilePath: string,
    markdownExportId: string,
  ) {
    const pageExport = await this.apis.getPageExport(docId, page.id, markdownExportId)

    if (!pageExport.downloadLink) {
      // retry later at low priority with current markdown export id
      this.tasks.add({
        id: page.id,
        execute: async () => await this.exportPage(page, markdownExportId),
        priority: TaskPriority.LOW,
      })

      return
    }

    this.setStatus(page.id, ITEM_STATUS_DOWNLOADING)
    this.items[page.id].syncedAt = getCurrentIsoDateTime()

    await ensureDir(dirname(pageFilePath))
    await download(pageExport.downloadLink, createWriteStream(pageFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.items[page.id].filePath = pageFilePath
  }

  private async exportPageAsHtml (docId: string, page: ICodaPage) {
    this.setStatus(page.id, ITEM_STATUS_FETCHING_IMAGES)
    const exportRes = await this.apis.exportPage(docId, page.id, 'html')

    return exportRes.id
  }

  private async downloadImageExportAndReplaceInMarkdown (
    docId: string,
    page: ICodaPage,
    pageFilePath: string,
    markdownContent: string,
    markdownExportId: string,
    htmlExportId: string,
  ) {
    this.setStatus(page.id, ITEM_STATUS_DOWNLOADING_IMAGES)
    const htmlExport = await this.apis.getPageExport(docId, page.id, htmlExportId)
    const htmlFilePath = pageFilePath.replace(/\.md$/, '.html')

    if (!htmlExport.downloadLink) {
      // retry later at low priority with current both markdown and html export ids
      this.tasks.add({
        id: page.id,
        execute: async () => await this.exportPage(page, markdownExportId, htmlExportId),
        priority: TaskPriority.LOW,
      })

      return
    }

    await download(htmlExport.downloadLink, createWriteStream(htmlFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.setStatus(page.id, ITEM_STATUS_REPLACING_IMAGES)
    const htmlContent = await readFile(htmlFilePath, 'utf8')
    const imageBlocks: string[] = []
    const imgTags = htmlContent.match(/<img[^>]+src="([^">]+)"/g)

    if (imgTags) {
      imgTags.forEach(imgTag => {
        const src = imgTag.match(/src="([^"]+)"/)?.[1]
        const alt = imgTag.match(/alt="([^"]*)"/)?.[1]

        imageBlocks.push(`![${alt}](${src})`)
      })
    }

    let replacedImageCount = 0
    let markdownContentWithImages = markdownContent.replace(CODA_IMAGE_REPLACEMENT_REGEX, emptyLines => {
      return imageBlocks[replacedImageCount]
        ? `\n\n${imageBlocks[replacedImageCount++]}\n\n`
        : emptyLines // restored empty lines if no images found from html export
    })

    if (replacedImageCount < imageBlocks.length) {
      markdownContentWithImages += imageBlocks.slice(replacedImageCount).join('\n')
    }

    await writeFile(pageFilePath, markdownContentWithImages, 'utf8')
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
