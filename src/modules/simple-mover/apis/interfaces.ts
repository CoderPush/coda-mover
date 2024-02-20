export interface ICodaApiDoc {
  id: string
  name: string
  browserLink: string
  ownerName: string
  owner: string // email address
  folder: {
    id: string
    browserLink: string
    name?: string
  }
  createdAt: string // ISO string
  updatedAt: string // ISO string
}

export interface ICodaDoc {
  id: string
  name: string
  browserLink: string
  ownerName: string
  ownerEmail: string
  folderName?: string
  folderBrowserLink: string
  treePath: string // typical / means based at root
  filePath?: string
  syncedAt?: string // ISO string
}

export interface ICodaApiPage {
  id: string
  name: string
  createdAt: string // ISO string
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
  permission: 'read' | 'read_write' | null
  sharing: boolean
}

export interface IOutlineDocument {
  id: string
  title: string
  collectionId: string
  parentDocumentId?: string
  createdAt: string
  updatedAt: string
}

export interface IOutlineSearchDocumentResult {
  context: string
  document: IOutlineDocument
}

export interface IOutlineCollectionInput extends Omit<Partial<IOutlineCollection>, 'id'> {
  private?: boolean
}

export interface IOutlineDocumentCreateInput extends Partial<Omit<IOutlineDocument, 'id' | 'createdAt' | 'updatedAt' >> {
  publish?: boolean
}

export interface IOutlineDocumentUpdateInput {
  id: string
  title?: string
}

export interface IOutlineDocumentTreeItem {
  id: string
  title: string
  children: IOutlineDocumentTreeItem[]
}

export interface IOutlineItem {
  id: string
  name: string
  treePath: string
}

export interface IOutlineApis {
  listCollections: (offset?: number) => Promise<IOutlineCollection[]>
  searchDocuments: (collectionId: string, query: string) => Promise<IOutlineDocument[]>
  createCollection: (collection: IOutlineCollectionInput) => Promise<IOutlineCollection>
  createDocument: (document: IOutlineDocumentCreateInput) => Promise<IOutlineDocument>
  getDocument: (documentId: string) => Promise<IOutlineDocument>
  archiveDocument: (documentId: string) => Promise<void>
  importDocumentByFile: (collectionId: string, filePath: string, parentDocumentId?: string) => Promise<IOutlineDocument>
  updateDocument: (document: IOutlineDocumentUpdateInput) => Promise<IOutlineDocument>
  getCollectionTree: (collectionId: string) => Promise<IOutlineDocumentTreeItem[]>
}
