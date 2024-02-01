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
  parent?: { id: string }
  contentType: string
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

export interface ICodaApis {
  listDocs: (pageToken?: string) => Promise<{
    items: ICodaApiDoc[]
    nextPageToken?: string
  }>
  listPagesForDoc: (docId: string, pageToken?: string) => Promise<{
    items: ICodaApiPage[]
    nextPageToken?: string
  }>
  exportPage: (
    docId: string,
    pageId: string,
    outputFormat?: 'markdown' | 'html',
  ) => Promise<{ id: string, status: string }>
  getPageExport: (
    docId: string,
    pageId: string,
    exportId: string,
  ) => Promise<{ status: string, downloadLink: string }>
}

export interface IOutlineCollection {
  id: string
  name: string
  permission: 'read' | 'read_write'
  private: boolean
}

export interface IOutlineDocument {
  id: string
  name: string
  collectionId: string
  parentDocumentId?: string
  createdAt: string
  updatedAt: string
}

export type IOutlineCollectionInput = Omit<Partial<IOutlineCollection>, 'id'>

export interface IOutlineApis {
  listCollections: (offset?: number) => Promise<IOutlineCollection[]>
  searchDocuments: (collectionId: string, query: string) => Promise<IOutlineDocument[]>
  createCollection: (collection: IOutlineCollectionInput) => Promise<IOutlineCollection>
  archiveDocument: (documentId: string) => Promise<void>
  importDocumentByFile: (collectionId: string, filePath: string, parentDocumentId?: string) => Promise<IOutlineDocument>
}
