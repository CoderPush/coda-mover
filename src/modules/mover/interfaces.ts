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

export interface IMoverClientHandlers {
  onConnection?: (state: 'opened' | 'closed') => void
  onItems?: (items: ICodaItems) => void
  onStatuses?: (itemStatuses: Record<string, IItemStatus>) => void
  onProgress?: (progress: number) => void
  onSelectionChange?: (selectedItemIds: string[]) => void
}

export interface IMoverClient {
  syncDocs: (apiToken: string) => void
  handleServerResponses: () => void
  select: (...itemIds: string[]) => void
  deselect: (...itemIds: string[]) => void
}
