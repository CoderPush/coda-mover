export interface ICodaApiDoc {
  id: string
  name: string
}

export interface ICodaDoc extends ICodaApiDoc {
  treePath: string // typical / means root
  filePath: string
}

export interface ICodaApiPage {
  id: string
  name: string
}

export interface ICodaPage extends ICodaApiPage {
  treePath: string
  filePath: string
}

export type ICodaItem = ICodaDoc | ICodaPage
export type ICodaItems = ICodaItem[]
