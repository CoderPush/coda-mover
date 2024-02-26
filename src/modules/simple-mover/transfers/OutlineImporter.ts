import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import {
  CLIENT_IMPORT_OUTLINE,
  ITEM_STATUS_CONFIRMING,
  ITEM_STATUS_DONE,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_IMPORTING,
  ITEM_STATUS_LISTING,
  ITEM_STATUS_PENDING,
  ITEM_STATUS_VALIDATING,
  ITEM_STATUS_WAITING,
} from '../events'
import type {
  ICodaDoc,
  ICodaItem,
  ICodaPage,
  IImporter,
  IMover,
  IOutlineApis,
  IOutlineDocument,
  IOutlineDocumentTreeItem,
  IOutlineItem,
  IStatus,
} from '../interfaces'
import { isAxiosError } from 'axios'
import { trimSlashes } from '../lib'
import { stat } from 'fs-extra'

const DEFAULT_COLLECTION_NAME = 'Coda'

export class OutlineImporter implements IImporter {
  private readonly tasks = new TaskEmitter({
    concurrency: 1,
    onItemError: (item, error) => {
      if (isAxiosError(error)) {
        this.tasks.add({ ...item, priority: TaskPriority.LOW })
        this.tasks.next()
      }

      this.setStatus(item.id!, ITEM_STATUS_ERROR, error.message)
      this.checkDoneStatus()
    },
    onItemDone: () => {
      this.checkDoneStatus()
    },
  })

  private collectionId: string | undefined
  private documentTreeItems: IOutlineItem[] = []
  private waitingExports: Array<{ id: string, outlineTreePath: string }> = []
  // coda id => corresponding outline index (for ordering)
  private readonly codaOrderingIndexes: Record<string, number> = {}

  constructor (
    private readonly mover: IMover,
    private readonly apis: IOutlineApis,
    private readonly selectedItems: ICodaItem[],
    private readonly collectionName = DEFAULT_COLLECTION_NAME,
  ) {}

  async validateImport () {
    try {
      const selectedDocs = this.selectedItems.filter(item => item.treePath === '/')
      if (!selectedDocs.length) throw Error('No docs selected for import')

      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_VALIDATING)

      // Note, only deal with max 100 collections
      // Please provide pagination for larger number of collections
      const collections = await this.apis.listCollections()
      const selectedCollection = collections.find(col => col.name === this.collectionName)

      if (!selectedCollection) {
        this.mover.returnImportIssues(
          `Private collection '${this.collectionName}' will be created`,
          'All docs and pages will be imported as brand new items',
        )
      } else {
        if (selectedCollection.permission !== null) {
          this.mover.returnImportIssues(
            `Collection '${this.collectionName}' exists and not private`,
          )
        }

        this.collectionId = selectedCollection.id
      }

      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_CONFIRMING)
    } catch (err: any) {
      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_ERROR, err.message as string)
    }
  }

  async confirmImport () {
    try {
      const selectedDocs = this.selectedItems.filter(item => item.treePath === '/') as ICodaDoc[]
      if (!selectedDocs.length) throw Error('No docs selected for import')

      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_IMPORTING)
      this.documentTreeItems = []

      if (!this.collectionId) await this.createCollectionIfNotExists()

      await this.collectDocumentTree(this.collectionId!)

      selectedDocs.forEach(doc => {
        this.setStatus(doc.id, ITEM_STATUS_PENDING)
        this.tasks.add({
          id: doc.id,
          execute: async () => await this.importDoc(doc),
        })
      })

      this.tasks.next()
    } catch (err: any) {
      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_ERROR, err.message as string)
    }
  }

  async createCollectionIfNotExists () {
    this.setStatus('collection', ITEM_STATUS_IMPORTING, `Creating collection '${this.collectionName}'`)
    const collection = await this.apis.createCollection({ name: this.collectionName, private: true })

    this.collectionId = collection.id
    this.setStatus('collection', ITEM_STATUS_DONE, `Created collection '${this.collectionName}'`)
  }

  async collectDocumentTree (collectionId: string) {
    this.setStatus('collection:tree', ITEM_STATUS_LISTING, 'Listing document tree')
    const docTree = await this.apis.getCollectionTree(collectionId)

    this.receiveDocumentTreeItems(docTree)
    this.setStatus('collection:tree', ITEM_STATUS_DONE, 'Listed document tree')
  }

  private receiveDocumentTreeItems (items: IOutlineDocumentTreeItem[], parentPath = '/') {
    if (!items.length) return

    items.forEach((item, idx) => {
      this.documentTreeItems.push({
        id: item.id,
        name: item.title,
        treePath: parentPath,
        index: idx,
      })
      this.receiveDocumentTreeItems(item.children, `${parentPath}${item.id}/`)
    })
  }

  private async importDoc (doc: ICodaDoc) {
    const outlineTreePath = '/'
    if (this.mover.itemStatuses[doc.id]?.status === ITEM_STATUS_LISTING) {
      this.setStatus(doc.id, ITEM_STATUS_WAITING, `Waiting for listing ${doc.name}`)
      this.waitingExports.push({ id: doc.id, outlineTreePath })

      return
    }

    this.setStatus(doc.id, ITEM_STATUS_IMPORTING, `Importing doc ${doc.name}`)
    this.waitingExports = this.waitingExports.filter(i => i.id === doc.id)

    if (this.mover.itemStatuses[doc.id]?.status !== ITEM_STATUS_DONE) {
      throw Error(`Error syncing ${doc.name} (${doc.id})`)
    }

    let docTreeItem = this.documentTreeItems.find(treeItem => (
      treeItem.name === doc.name && treeItem.treePath === outlineTreePath
    ))

    if (!docTreeItem) {
      const newDocument = await this.createAndPublishDocIfNotExists(doc)

      docTreeItem = { id: newDocument.id, name: newDocument.title, treePath: '/' }
      this.documentTreeItems.push(docTreeItem)
    }

    const innerOutlineTreePath = `${outlineTreePath}${docTreeItem.id}/`
    const innerPages = this.mover.getInnerPages(doc)

    innerPages.forEach((innerPage, index) => {
      this.codaOrderingIndexes[innerPage.id] = index
      this.setStatus(innerPage.id, ITEM_STATUS_PENDING)
      this.tasks.add({
        id: innerPage.id,
        execute: async () => await this.importPage(innerPage, innerOutlineTreePath),
      })
    })

    this.setStatus(doc.id, ITEM_STATUS_DONE, `Imported ${doc.name}`)
  }

  private async importPage (page: ICodaPage, outlineTreePath = '/') {
    if (this.mover.itemStatuses[page.id]?.status !== ITEM_STATUS_DONE) {
      this.setStatus(page.id, ITEM_STATUS_WAITING, `Waiting for syncing ${page.name}`)
      this.waitingExports.push({ id: page.id, outlineTreePath })

      return
    }

    this.setStatus(page.id, ITEM_STATUS_IMPORTING, `Importing page ${page.name}`)
    this.waitingExports = this.waitingExports.filter(i => i.id !== page.id)

    const outlineParentId = trimSlashes(outlineTreePath).split('/').pop()
    if (!outlineParentId) throw Error('Outline parent id not found')

    const docTreeItem = this.documentTreeItems.find(treeItem => (
      treeItem.name === page.name && treeItem.treePath === outlineTreePath
    ))

    let importedPage: IOutlineDocument | undefined
    let isPageOutOfSync = true

    if (docTreeItem) {
      importedPage = await this.apis.getDocument(docTreeItem.id)
      isPageOutOfSync = importedPage.updatedAt < page.syncedAt!
    }

    if (isPageOutOfSync) {
      await this.validatePageFileSize(page)

      importedPage = await this.importPageWithHtml(page, outlineParentId)
    }

    if (!importedPage) throw Error('Failed to import page')

    const outlineId = importedPage.id
    const innerOutlineTreePath = `${outlineTreePath}${importedPage.id}/`
    const shouldArchiveOutdatedPage = docTreeItem && isPageOutOfSync
    const orderingIndex = this.codaOrderingIndexes[page.id]
    const shouldFixDocumentOrder = orderingIndex !== undefined && docTreeItem?.index !== orderingIndex
    const innerPages = this.mover.getInnerPages(page)

    innerPages.forEach((innerPage, index) => {
      this.codaOrderingIndexes[innerPage.id] = index
      this.setStatus(innerPage.id, ITEM_STATUS_PENDING)
      this.tasks.add({
        id: innerPage.id,
        execute: async () => await this.importPage(innerPage, innerOutlineTreePath),
      })
    })

    if (shouldArchiveOutdatedPage) this.queueArchivingOutdatedPage(page.id, docTreeItem.id)
    if (shouldFixDocumentOrder) this.queueFixingDocumentOrder(page.id, outlineId, outlineParentId, orderingIndex)

    this.setStatus(page.id, ITEM_STATUS_DONE, isPageOutOfSync ? `Imported ${page.name}` : `Skipped ${page.name}`)
  }

  async createAndPublishDocIfNotExists (doc: ICodaDoc) {
    return await this.apis.createDocument({
      title: doc.name,
      collectionId: this.collectionId,
      publish: true,
    })
  }

  private queueArchivingOutdatedPage (pageId: string, outlineId: string) {
    this.tasks.add({
      id: `archive::${pageId}`,
      priority: TaskPriority.IDLE,
      execute: async () => {
        await this.archiveOutdatedPage(outlineId)
        this.setStatus(`archive::${pageId}`, ITEM_STATUS_DONE)
      },
    })

    this.tasks.next()
  }

  async archiveOutdatedPage (outlineId: string) {
    await this.apis.archiveDocument(outlineId)
  }

  async validatePageFileSize (page: ICodaPage) {
    const stats = await stat(page.filePath!)
    const fileSizeInBytes = stats.size
    // convert to MB, keep 2 decimal places
    const fileSizeInMB = Math.floor(fileSizeInBytes / 1024 / 1024 * 100) / 100

    if (fileSizeInMB > 1.45) {
      throw new Error('Should be manually imported, file size limit exceeded')
    }
  }

  async importPageWithHtml (page: ICodaPage, parentDocumentId: string) {
    let importedPage = await this.apis.importDocumentByFile(this.collectionId!, page.filePath!, parentDocumentId)

    if (importedPage.title !== page.name) {
      importedPage = await this.apis.updateDocument({ id: importedPage.id, title: page.name })
    }

    return importedPage
  }

  private queueFixingDocumentOrder (
    pageId: string,
    documentId: string,
    parentDocumentId: string,
    orderingIndex: number,
  ) {
    this.tasks.add({
      id: `order::${pageId}`,
      priority: TaskPriority.IDLE,
      execute: async () => {
        await this.apis.moveDocument({
          id: documentId,
          collectionId: this.collectionId!,
          parentDocumentId,
          index: orderingIndex,
        })

        this.setStatus(`order::${pageId}`, ITEM_STATUS_DONE)
      },
    })

    this.tasks.next()
  }

  private setStatus (id: string, status: IStatus, message?: string) {
    const itemId = id === CLIENT_IMPORT_OUTLINE ? id : `import::${id}`

    this.mover.setStatus(itemId, status, message)
  }

  private checkDoneStatus () {
    if (
      this.tasks.pendingCount + this.tasks.runningCount <= 1 &&
      this.waitingExports.length === 0
    ) {
      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_DONE)
    }
  }

  stopPendingImports () {
    this.tasks.dispose()
  }

  onItemExported (item: ICodaItem) {
    const isDoc = item.treePath === '/'
    const waitingItem = this.waitingExports.find(i => i.id === item.id)
    if (!waitingItem) return

    if (isDoc) {
      this.tasks.add({
        id: item.id,
        execute: async () => await this.importDoc(item as ICodaDoc),
        priority: TaskPriority.LOW,
      })
    } else {
      this.tasks.add({
        id: item.id,
        execute: async () => await this.importPage(item, waitingItem.outlineTreePath),
        priority: TaskPriority.LOW,
      })
    }

    this.tasks.next()
  }
}
