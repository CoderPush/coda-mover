import axios, { type AxiosInstance } from 'axios'
import type {
  IOutlineCollection,
  IOutlineCollectionInput,
  IOutlineDocument,
  IOutlineApis,
  IOutlineSearchDocumentResult,
  IOutlineDocumentUpdateInput,
  IOutlineDocumentCreateInput,
  IOutlineDocumentMoveInput,
  IOutlineListUsersInput,
} from './interfaces'
import { createReadStream, pathExists } from 'fs-extra'
import FormData from 'form-data'

export class OutlineApis implements IOutlineApis {
  private readonly apis: AxiosInstance

  constructor (token: string) {
    this.apis = axios.create({
      baseURL: 'https://app.getoutline.com/api',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  async listCollections (offset: number = 0) {
    const { data } = await this.apis.post('/collections.list', { offset, limit: 100 })
    const items: IOutlineCollection[] = data.data || []

    return items
  }

  async searchDocuments (collectionId: string, query: string) {
    const { data } = await this.apis.post('/documents.search', {
      collectionId,
      query,
      limit: 25,
      includeArchived: false,
      includeDrafts: false,
    })

    const results: IOutlineSearchDocumentResult[] = data.data || []
    const items: IOutlineDocument[] = results.map(result => result.document)

    return items
  }

  async createCollection (collection: IOutlineCollectionInput) {
    if (!collection.name) throw Error('[outline] collection name is required')

    const { data } = await this.apis.post('/collections.create', {
      private: true,
      icon: 'truck',
      ...collection,
    })

    return data.data
  }

  async createDocument (document: IOutlineDocumentCreateInput) {
    const { data } = await this.apis.post('/documents.create', document)

    return data.data
  }

  async getDocument (documentId: string) {
    const { data } = await this.apis.post('/documents.info', { id: documentId })

    return data.data
  }

  async archiveDocument (documentId: string) {
    await this.apis.post('/documents.archive', { id: documentId })
  }

  async importDocumentByFile (collectionId: string, filePath: string, parentDocumentId?: string) {
    if (!await pathExists(filePath)) throw Error(`[outline] import file not found: ${filePath}`)

    const formData = new FormData()

    formData.append('collectionId', collectionId)
    formData.append('file', createReadStream(filePath))
    formData.append('publish', 'true')
    parentDocumentId && formData.append('parentDocumentId', parentDocumentId)

    const { data } = await this.apis.post('/documents.import', formData)

    return data.data
  }

  async updateDocument (document: IOutlineDocumentUpdateInput) {
    const { data } = await this.apis.post('/documents.update', document)

    return data.data
  }

  async getCollectionTree (collectionId: string) {
    const { data } = await this.apis.post('/collections.documents', { id: collectionId })

    return data.data
  }

  async moveDocument (input: IOutlineDocumentMoveInput) {
    await this.apis.post('/documents.move', input)
  }

  async listUsers (input: IOutlineListUsersInput) {
    const { data } = await this.apis.post('/users.list', input)

    return data.data
  }
}
