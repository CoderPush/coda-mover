export interface ICodaApiDoc {
  id: string
  name: string
  updatedAt: string // ISO string
}

export interface ICodaDoc {
  id: string
  name: string
  treePath: string // typical / means based at root
  filePath?: string
  syncedAt?: string // ISO string
}

export interface ICodaApiPage {
  id: string
  name: string
  updatedAt: string // ISO string
}

export interface ICodaPage {
  id: string
  name: string
  treePath: string
  filePath?: string
  syncedAt?: string // ISO string
}

export type ICodaItem = ICodaDoc | ICodaPage
export type ICodaItems = ICodaItem[]
