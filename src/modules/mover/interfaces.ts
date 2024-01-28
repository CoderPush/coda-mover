export interface IItemStatus {
  id: string
  status: string
  message?: string
}

export type IItemStatuses = Record<string, IItemStatus>
