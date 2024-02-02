import type { ITaskPriority } from '@abxvn/tasks'
import type { ICodaDoc, ICodaItem, ICodaItems, ICodaPage } from './apis/interfaces'

export * from './apis/interfaces'

export interface IItemStatus {
  id: string
  status: string
  message?: string
}

export type IItemStatuses = Record<string, IItemStatus>

export interface IMoverServer {
  queue: (id: string, execute: () => any | Promise<any>, priority?: ITaskPriority) => void
  emit: (event: string, data: any) => void
  notifyStatus: (id: string, status: string, message?: string) => void
  logError: (err: any, itemId?: string) => void
}

export interface IPuller {
  readonly items: Record<string, ICodaItem>

  loadSyncedData: () => Promise<void>

  syncDocs: () => Promise<void>
  returnDocs: (docs: ICodaDoc[]) => void
  returnPages: (pages: ICodaPage[]) => void

  revalidateDoc: (restoredDoc: ICodaDoc, updatedDoc: ICodaDoc) => Promise<void>
  saveDoc: (doc: ICodaDoc, updatedAt: string) => Promise<void>

  listPagesForDoc: (doc: ICodaDoc) => Promise<void>
  revalidateAndSavePage: (doc: ICodaDoc, page: ICodaPage, updatedAt: string) => Promise<void>

  // cleanup
}

export interface IImport {
  id: string
  items: ICodaItems
  issues: string[]
  instructions: IImportInstruction[]
  logs: IImportLog[]
  createdAt: string
  itemIdMap: Record<string, string>
}

export interface IImportLog {
  level: 'info' | 'error' | 'success'
  message: string
}

export interface IImportInstruction {
  id: number
  name: keyof IPusherInstructors | 'skip'
  reason?: string
  itemId: string
  collectionId?: string
  documentId?: string
}

export interface IPusherInstructors {
  createCollectionAsPrivate: (instruction: IImportInstruction) => Promise<void>
  archiveOutdatedPage: (instruction: IImportInstruction) => Promise<void>
  importAndPublishPage: (instruction: IImportInstruction) => Promise<void>
}

export interface IPusher extends IPusherInstructors {
  readonly data: IImport

  validate: () => Promise<void>
  validateCollectionTree: () => Promise<void>
  revalidatePages: () => Promise<void>

  process: () => Promise<void>
  returnIssues: (issues: string[]) => void
  returnProgressLogs: (logs: IImportLog[]) => void
}

export interface IMoverClientHandlers {
  onConnection?: (state: 'opened' | 'closed') => void
  onItems?: (items: ICodaItems) => void
  onStatuses?: (itemStatuses: Record<string, IItemStatus>) => void
  onProgress?: (progress: number) => void
  onSelectionChange?: (selectedItemIds: string[]) => void
  onImportIssues?: (issues: string[]) => void
  onImportLogs?: (logs: IImportLog[]) => void
}

export interface IMoverClient {
  syncDocs: (apiToken: string) => void

  importToOutline: (importId: string, apiToken: string) => void
  confirmImport: (importId: string) => void

  handleServerResponses: () => void
  select: (...itemIds: string[]) => void
  deselect: (...itemIds: string[]) => void
}
