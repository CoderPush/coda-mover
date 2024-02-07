import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import {
  CLIENT_IMPORT_OUTLINE,
  ITEM_STATUS_ARCHIVING,
  ITEM_STATUS_CONFIRMING,
  ITEM_STATUS_DONE,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_IMPORTING,
  ITEM_STATUS_LISTING,
  ITEM_STATUS_PENDING,
  ITEM_STATUS_SKIPPED,
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
    },
    onItemDone: () => {
      if (
        this.tasks.pendingCount + this.tasks.runningCount <= 1 &&
        this.waitingExports.length === 0
      ) {
        this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_DONE)
      }
    },
  })

  private collectionId: string | undefined
  private documentTreeItems: IOutlineItem[] = []
  private waitingExports: Array<{ id: string, outlineTreePath: string }> = []

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
      const selectedDocs = this.selectedItems.filter(item => item.treePath === '/')
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

    items.forEach(item => {
      this.documentTreeItems.push({ id: item.id, name: item.title, treePath: parentPath })
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

    const innerCodaTreePath = `${doc.treePath}${doc.id}/`
    const innerOutlineTreePath = `${outlineTreePath}${docTreeItem.id}/`
    const innerPages = Object.values(this.mover.items).filter(item => (
      item.treePath === innerCodaTreePath
    ))

    innerPages.forEach(innerPage => {
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
      importedPage = await this.importPageWithHtml(page, outlineParentId)
    }

    if (!importedPage) throw Error('Failed to import page')

    const innerCodaTreePath = `${page.treePath}${page.id}/`
    const innerOutlineTreePath = `${outlineTreePath}${importedPage.id}/`
    const innerPages = Object.values(this.mover.items).filter(item => (
      item.treePath === innerCodaTreePath
    ))

    innerPages.forEach(innerPage => {
      this.setStatus(innerPage.id, ITEM_STATUS_PENDING)
      this.tasks.add({
        id: innerPage.id,
        execute: async () => await this.importPage(innerPage, innerOutlineTreePath),
      })
    })

    if (docTreeItem && isPageOutOfSync) {
      this.setStatus(page.id, ITEM_STATUS_ARCHIVING, `Archiving outdated page ${page.name}`)
      await this.archiveOutdatedPage(docTreeItem.id)
    }

    if (isPageOutOfSync) {
      this.setStatus(page.id, ITEM_STATUS_DONE, `Imported ${page.name}`)
    } else {
      this.setStatus(page.id, ITEM_STATUS_SKIPPED, `Skipped ${page.name}`)
    }
  }

  async createAndPublishDocIfNotExists (doc: ICodaDoc) {
    return await this.apis.createDocument({
      title: doc.name,
      collectionId: this.collectionId,
      publish: true,
    })
  }

  async archiveOutdatedPage (outlineId: string) {
    await this.apis.archiveDocument(outlineId)
  }

  async importPageWithHtml (page: ICodaPage, parentDocumentId: string) {
    let importedPage = await this.apis.importDocumentByFile(this.collectionId!, page.filePath!, parentDocumentId)

    if (importedPage.title !== page.name) {
      importedPage = await this.apis.updateDocument({ id: importedPage.id, title: page.name })
    }

    return importedPage
  }

  private setStatus (id: string, status: IStatus, message?: string) {
    const itemId = id === CLIENT_IMPORT_OUTLINE ? id : `import::${id}`

    this.mover.setStatus(itemId, status, message)
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
        execute: async () => await this.importDoc(item),
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
