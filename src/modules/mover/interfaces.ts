export type { ICodaDoc, ICodaItem, ICodaItems, ICodaApiDoc, ICodaApiPage, ICodaPage } from '../coda-doc-puller/interfaces'

export interface IItemStatus {
  id: string
  status: string
  message?: string
}

export type IItemStatuses = Record<string, IItemStatus>
