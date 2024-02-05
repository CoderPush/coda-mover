import type { ICodaItem, ICodaPage } from './apis/interfaces'
import type { ITEM_STATUSES } from './events'

export * from './apis/interfaces'

export type IStatus = typeof ITEM_STATUSES[number]

export interface IExporter {
  queuePageExport: (page: ICodaPage) => void
  exportPage: (page: ICodaPage) => Promise<void>
  stopPendingExports: () => void
}

export interface IMover {
  readonly items: Record<string, ICodaItem>

  listDocs: () => void
  listPages: (docId: string) => void

  setStatus: (id: string, status: IStatus, message?: string) => void
  getStatus: (id: string) => string

  saveItems: () => Promise<void>
}

export interface IItemStatus {
  id: string
  status: IStatus
  message?: string
}

export interface IServer {
  emit: (event: string, data: any) => void

  handleClientListDocs: () => void
}

export interface IClient {
  listDocs: (apiToken: string) => void

  handleServerResponses: () => void
  select: (...itemIds: string[]) => void
  deselect: (...itemIds: string[]) => void
}

export type IItemStatuses = Record<string, IItemStatus>

export interface IClientHandlers {
  onConnection?: (state: 'opened' | 'closed') => void
  onItems?: (items: ICodaItem[]) => void
  onStatuses?: (itemStatuses: IItemStatuses) => void
  onSelectionChange?: (selectedItemIds: string[]) => void
}
