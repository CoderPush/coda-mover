import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { isAxiosError } from 'axios'
import type { ICodaApis, ICodaPage, IMover, IExporter, IStatus, IOutlineApis } from '../interfaces'
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
  ITEM_STATUS_FETCHING_USERS,
  ITEM_STATUS_REPLACING_MENTIONS,
} from '../events'
import { dirname } from 'path'

const CODA_IMAGE_REPLACEMENT_START_REGEX = /^\n{2}/
const CODA_IMAGE_REPLACEMENT_BODY_REGEX = /\n{4}/g
const CODA_MENTION_REPLACEMENT_REGEX = /\[[^\]]+\]\(mailto:[^)]+\)/g

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
    private readonly apis: ICodaApis,
    private readonly outlineApis?: IOutlineApis
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
    if (!imageExportId) {
      const isMarkdownDownloaded = await this.downloadMarkdownExport(docId, page, pageFilePath, exportId)

      if (!isMarkdownDownloaded) {
        return
      }
    }

    const markdownContent = await readFile(pageFilePath, 'utf8')
    const shouldAddImages = CODA_IMAGE_REPLACEMENT_START_REGEX.test(markdownContent) ||
      CODA_IMAGE_REPLACEMENT_BODY_REGEX.test(markdownContent)
    const shouldReplaceMentions = CODA_MENTION_REPLACEMENT_REGEX.test(markdownContent)

    if (shouldAddImages) {
      if (!imageExportId) imageExportId = await this.exportPageAsHtml(docId, page)
      if (!imageExportId) throw Error('html images export isn\'t requested')

      const isImageReplaced = await this.downloadImageExportAndReplaceInMarkdown(
        docId,
        page,
        pageFilePath,
        markdownContent,
        exportId,
        imageExportId,
      )

      if (!isImageReplaced) {
        return
      }
    }

    if (shouldReplaceMentions) {
      const markdownContentWithImages = await readFile(pageFilePath, 'utf8')
      const isMentionReplaces = await this.fetchingUsersAndReplaceInMarkdown(page, pageFilePath, markdownContentWithImages)

      if (!isMentionReplaces) {
        return
      }
    }

    this.setStatus(page.id, ITEM_STATUS_DONE)
  }

  private async fetchingUsersAndReplaceInMarkdown (page: ICodaPage, pageFilePath: string, markdownContent: string) {
    this.setStatus(page.id, ITEM_STATUS_FETCHING_USERS)
    if (!this.outlineApis) throw Error('No outline token')

    const mentions = markdownContent.match(CODA_MENTION_REPLACEMENT_REGEX)
    if (!mentions?.length) return

    const emailsSet = new Set<string>(mentions.map(mention => {
      const email = mention.match(/(?<=mailto:)[^)]+/)

      return email ? email[0] : ''
    }))

    const emails: string[] = [...emailsSet]

    const users = await this.outlineApis.listUsers({ emails })
    const replacedMentions: string[] = []

    this.setStatus(page.id, ITEM_STATUS_REPLACING_MENTIONS)
    mentions.forEach((mentioned) => {
      const matched = mentioned.match(/\[(.*?)\]/)
      const name = matched?.[1]
      const user = users.find((user) => user.name === name)

      if (!user) return

      const parts = user.avatarUrl.split('/')
      const avatarId = parts[parts.length - 1]

      replacedMentions.push(`@[${name}](mention://${user?.id}/user/${avatarId})`)
    })

    let replacementCount = 0
    const markdownContentWithMentioned = markdownContent.replace(CODA_MENTION_REPLACEMENT_REGEX, matched => {
      return replacedMentions[replacementCount]
        ? `${replacedMentions[replacementCount++]}`
        : matched
    })

    await writeFile(pageFilePath, markdownContentWithMentioned, 'utf8')

    return true
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

      return false
    }

    this.setStatus(page.id, ITEM_STATUS_DOWNLOADING)
    this.items[page.id].syncedAt = getCurrentIsoDateTime()

    await ensureDir(dirname(pageFilePath))
    await download(pageExport.downloadLink, createWriteStream(pageFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.items[page.id].filePath = pageFilePath

    return true
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

      return false
    }

    await download(htmlExport.downloadLink, createWriteStream(htmlFilePath, {
      flags: 'w',
      encoding: 'utf8',
    }))

    this.setStatus(page.id, ITEM_STATUS_REPLACING_IMAGES)
    const htmlContent = await readFile(htmlFilePath, 'utf8')
    const replacedBlocks: string[] = []
    // img and hr tags are rendered as 3 empty lines or 2 empty lines at start
    const replacedHtmlTags = htmlContent.match(/<img[^>]+src="[^">]+"|<hr/g)

    replacedHtmlTags?.forEach(tag => {
      if (!tag.startsWith('<img')) { // not image tag, ignored
        return replacedBlocks.push('\n')
      }

      const src = tag.match(/src="([^"]*)"/)?.[1]
      const alt = tag.match(/alt="([^"]*)"/)?.[1]

      replacedBlocks.push(`![${alt}](${src})`)
    })

    let replacementCount = 0
    let markdownContentWithImages = markdownContent.replace(CODA_IMAGE_REPLACEMENT_START_REGEX, emptyLines => {
      return replacedBlocks[replacementCount]
        ? `${replacedBlocks[replacementCount++]}\n\n`
        : emptyLines // restore empty lines if replacement not found from html export
    })

    markdownContentWithImages = markdownContentWithImages.replace(CODA_IMAGE_REPLACEMENT_BODY_REGEX, emptyLines => {
      return replacedBlocks[replacementCount]
        ? `\n\n${replacedBlocks[replacementCount++]}\n\n`
        : emptyLines // restore empty lines if replacement not found from html export
    })

    if (replacementCount < replacedBlocks.length) {
      markdownContentWithImages += replacedBlocks.slice(replacementCount).join('\n\n')
    }

    await writeFile(pageFilePath, markdownContentWithImages, 'utf8')

    return true
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
