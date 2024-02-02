import { ensureDir, pathExists, writeJson } from 'fs-extra'
import { SERVER_IMPORT_ISSUES, SERVER_IMPORT_LOGS, STATUS_IMPORT_CONFIRMING, STATUS_IMPORT_DONE, STATUS_IMPORT_PROCESSING, STATUS_IMPORT_VALIDATING } from './events'
import type {
  ICodaDoc,
  ICodaPage,
  IImport,
  IImportInstruction,
  IImportLog,
  IMoverServer,
  IOutlineApis,
  IPusher,
} from './interfaces'
import { importsPath } from './paths'
import { TaskPriority } from '@abxvn/tasks'

export class MoverServerOutlinePusher implements IPusher {
  static readonly CONNECTOR_ID = 'outline'
  private _processedInstructionCount = 0

  constructor (
    readonly data: IImport,
    readonly server: IMoverServer,
    readonly apis: IOutlineApis
  ) {}

  async validate () {
    this.server.notifyStatus(`import:${this.data.id}`, STATUS_IMPORT_VALIDATING)

    await this.validateCollectionTree()
    await this.revalidatePages()

    this.server.notifyStatus(`import:${this.data.id}`, STATUS_IMPORT_CONFIRMING)
  }

  async validateCollectionTree () {
    const importedDocs = this.data.items.filter(item => item.treePath === '/') as ICodaDoc[]
    // TODO: pagination if needing to deal with more than 100 collections
    const collections = await this.apis.listCollections()

    importedDocs.forEach(doc => {
      const collection = collections.find(collection => collection.name === doc.name)
      if (!collection) return this.addInstruction({ name: 'createCollectionAsPrivate', itemId: doc.id })
      if (collection.permission !== null) {
        this.addIssue(`Collection ${collection.name} exists and not private`)
      }

      this.data.itemIdMap[doc.id] = collection.id
      this.addInstruction({ name: 'skip', itemId: doc.id, reason: 'collection exists' })
    })
  }

  async revalidatePages () {
    const importedPages = this.data.items.filter(item => item.treePath !== '/') as ICodaPage[]

    await Promise.all(importedPages.map(async page => await this.revalidatePage(page)))
  }

  private async revalidatePage (page: ICodaPage) {
    const docId = page.treePath.replace(/^\//, '').split('/').shift()
    if (!docId) throw Error('[outline pusher] page treePath is invalid')

    if (!page.filePath || !await pathExists(page.filePath)) {
      return this.addIssue(`Page ${page.name} (${page.id}) missing file`)
    }

    const mappedCollectionId = this.data.itemIdMap[docId]
    if (!mappedCollectionId) {
      // parent collection not created yet, page will be import normally
      return this.addInstruction({ name: 'importAndPublishPage', itemId: page.id })
    }

    const query = page.name
    const pageSearchRes = await this.apis.searchDocuments(mappedCollectionId, query)
    const existingPage = pageSearchRes.find(item => item.title === page.name)
    if (!existingPage) {
      // new page will be import normally
      return this.addInstruction({ name: 'importAndPublishPage', itemId: page.id })
    }

    this.data.itemIdMap[page.id] = existingPage.id
    const isPageOutdated = page.syncedAt && (
      existingPage.createdAt < page.syncedAt ||
        existingPage.updatedAt < page.syncedAt
    )

    if (isPageOutdated) {
      this.addInstruction({ name: 'archiveOutdatedPage', itemId: page.id, documentId: existingPage.id })
      this.addInstruction({ name: 'importAndPublishPage', itemId: page.id })
      this.addIssue(`Document ${page.name} (${page.id}) is outdated and will be archived`)
    } else {
      this.addInstruction({ name: 'skip', itemId: page.id, reason: 'document up to date' })
    }
  }

  returnIssues (issues: string[]) {
    this.server.emit(SERVER_IMPORT_ISSUES, issues)
  }

  async process () {
    this.server.notifyStatus(`import:${this.data.id}`, STATUS_IMPORT_PROCESSING)

    // start with doc based instructions
    const selectedDocIds = this.data.items.filter(item => item.treePath === '/').map(doc => doc.id)
    const docInstructions = this.data.instructions.filter(
      instruction => selectedDocIds.includes(instruction.itemId)
    )

    docInstructions.forEach(instruction => {
      this.server.queue(`pusher:${this.data.id}:${instruction.id}`, async () => {
        await this.processInstruction(instruction)
      })
    })

    const processTimestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '')

    // save import data for debugging
    this.server.queue(
      'save import data',
      async () => await this.saveData(`${MoverServerOutlinePusher.CONNECTOR_ID}-${processTimestamp}.json`),
      TaskPriority.IDLE,
    )
  }

  private async processInstruction (instruction: IImportInstruction) {
    this._processedInstructionCount++
    if (instruction.name !== 'skip') await this[instruction.name](instruction)

    const itemId = instruction.itemId
    const directChildItemIds = this.data.items.filter(
      item => item.treePath.endsWith(`/${itemId}/`)
    ).map(item => item.id)
    const directChildItemInstructions = this.data.instructions.filter(
      instruction => directChildItemIds.includes(instruction.itemId)
    )

    directChildItemInstructions.forEach(instruction => {
      this.server.queue(`pusher:${this.data.id}:${instruction.id}`, async () => {
        await this.processInstruction(instruction)
      })
    })

    if (this._processedInstructionCount >= this.data.instructions.length) {
      this.server.notifyStatus(`import:${this.data.id}`, STATUS_IMPORT_DONE)
    }
  }

  async createCollectionAsPrivate (instruction: IImportInstruction) {
    const doc = this.data.items.find(item => item.id === instruction.itemId) as ICodaDoc
    if (!doc) {
      this.addLog({ level: 'error', message: `Missing doc ${instruction.itemId}` })

      return
    }

    const collection = await this.apis.createCollection({ name: doc.name, private: true })

    this.addLog({ level: 'success', message: `Created collection ${collection.name}` })
    this.data.itemIdMap[doc.id] = collection.id
  }

  async archiveOutdatedPage (instruction: IImportInstruction) {
    const documentId = instruction.documentId
    const page = this.data.items.find(item => item.id === instruction.itemId) as ICodaPage
    if (!page) return this.addLog({ level: 'error', message: `Missing page ${instruction.itemId}` })
    if (!documentId) {
      return this.addLog({ level: 'error', message: `Page ${page.name} (${page.id}) cannot be archived without document id` })
    }

    await this.apis.archiveDocument(documentId)

    this.addLog({ level: 'success', message: `Archived outdated document ${page?.name}` })
  }

  async importAndPublishPage (instruction: IImportInstruction) {
    const pageId = instruction.itemId
    const page = this.data.items.find(item => item.id === pageId) as ICodaPage
    if (!page) return this.addLog({ level: 'error', message: `Missing page ${pageId}` })

    const pageTreePath = page.treePath.replace(/^\/|\/$/g, '')
    const pageTreePathParts = pageTreePath.split('/')
    const docId = pageTreePathParts.shift()
    if (!docId) return this.addLog({ level: 'error', message: `Missing doc for page ${pageId}` })

    const collectionId = this.data.itemIdMap[docId]
    if (!collectionId) return this.addLog({ level: 'error', message: `Collection not imported for page ${pageId}` })

    const parentPageId = pageTreePathParts.pop()
    const parentOutlineDocumentId = parentPageId && this.data.itemIdMap[parentPageId]

    if (parentPageId && !parentOutlineDocumentId) {
      return this.addLog({ level: 'error', message: `Parent page not imported for page ${pageId}` })
    }

    if (!page.filePath) {
      return this.addLog({ level: 'error', message: `Missing file path for page ${pageId}` })
    }

    const importedDocument = await this.apis.importDocumentByFile(collectionId, page.filePath, parentOutlineDocumentId)
    const importedDocumentId = importedDocument.id

    this.addLog({ level: 'success', message: `Imported page ${page.name}` })

    this.data.itemIdMap[pageId] = importedDocumentId

    await this.apis.updateDocument({ id: importedDocumentId, title: page.name })
  }

  returnProgressLogs (logs: IImportLog[]) {
    this.server.emit(SERVER_IMPORT_LOGS, logs)
  }

  async saveData (jsonFileName: string) {
    await ensureDir(importsPath)
    await writeJson(`${importsPath}/${jsonFileName}`, this.data)
  }

  private addInstruction (instruction: Omit<IImportInstruction, 'id'>) {
    this.data.instructions.push({
      id: this.data.instructions.length,
      ...instruction,
    })
  }

  private addIssue (issue: string) {
    this.data.issues.push(issue)
    this.returnIssues(this.data.issues)
  }

  private addLog (log: IImportLog) {
    this.data.logs.push(log)
    this.returnProgressLogs(this.data.logs)
  }
}
