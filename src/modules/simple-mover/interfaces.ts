import type { ICodaDoc, ICodaItem, ICodaPage, IOutlineDocument } from './apis/interfaces'
import type { ItemStatuses } from './events'

export * from './apis/interfaces'

export type IStatus = typeof ItemStatuses[number]

export interface IExporter {
  queuePageExport: (page: ICodaPage) => void
  exportPage: (page: ICodaPage) => Promise<void>
  stopPendingExports: () => void
}

export interface IImporter {
  validateImport: () => Promise<void>

  confirmImport: () => Promise<void>
  createCollectionIfNotExists: () => Promise<void>
  collectDocumentTree: (collectionId: string) => Promise<void>
  createAndPublishDocIfNotExists: (doc: ICodaDoc) => Promise<IOutlineDocument>
  archiveOutdatedPage: (outlineId: string) => Promise<void>
  importPageWithHtml: (page: ICodaPage, parentDocumentId: string) => Promise<IOutlineDocument>

  stopPendingImports: () => void
}

export interface IMover {
  readonly items: Record<string, ICodaItem>
  readonly itemStatuses: Record<string, IItemStatus>

  listDocs: () => void
  listPages: (docId: string) => void

  requestImportOutline: (outlineApiToken: string, items: ICodaItem[]) => Promise<void>
  confirmImport: () => Promise<void>
  returnImportIssues: (...issues: string[]) => void
  cancelImports: () => void

  setStatus: (id: string, status: IStatus, message?: string) => void
  getStatus: (id: string) => string

  saveItems: () => Promise<void>
  dispose: () => void
}

export interface IItemStatus {
  id: string
  status: IStatus
  message?: string
}

export interface IServer {
  emit: (event: string, data: any) => void

  handleClientListDocs: () => void
  handleClientImportOutline: () => void
}

export interface IClient {
  listDocs: (codaApiToken: string) => void

  handleServerResponses: () => void
  select: (...itemIds: string[]) => void
  deselect: (...itemIds: string[]) => void

  importToOutline: (outlineApiToken: string) => void
  confirmImport: () => void
  cancelImport: () => void
}

export type IItemStatuses = Record<string, IItemStatus>

export interface IClientHandlers {
  onConnection?: (state: 'opened' | 'closed') => void
  onItems?: (items: ICodaItem[]) => void
  onStatuses?: (itemStatuses: IItemStatuses) => void
  onSelectionChange?: (selectedItemIds: string[]) => void
  onImportIssues?: (issues: string[]) => void
  onImportLogs?: (logs: IImportLog[]) => void
}

export interface IImportLog {
  id: string
  level: 'success' | 'error' | 'info'
  message: string
}
