import axios, { type AxiosInstance, isAxiosError } from 'axios'
import type { ICodaApiDoc, ICodaApiPage, ICodaApis } from './interfaces'

export class CodaApis implements ICodaApis {
  private readonly apis: AxiosInstance

  constructor (token: string) {
    this.apis = axios.create({
      baseURL: 'https://coda.io/apis/v1',
      headers: { Authorization: `Bearer ${token}` },
    })
  }

  async listDocs (pageToken?: string) {
    const params = pageToken ? { pageToken } : { limit: 100 }
    const { data } = await this.apis.get('/docs', { params })
    const items = data.items as ICodaApiDoc[] || []
    const nextPageToken: string | undefined = data.nextPageToken

    return {
      items,
      nextPageToken,
    }
  }

  async listPagesForDoc (docId: string, pageToken?: string) {
    const params = pageToken ? { pageToken } : { limit: 50 }
    const { data } = await this.apis.get(`/docs/${docId}/pages`, { params })
    const items = data.items as ICodaApiPage[] || []
    const nextPageToken: string | undefined = data.nextPageToken

    return {
      items,
      nextPageToken,
    }
  }

  async exportPage (docId: string, pageId: string, outputFormat: 'html' | 'markdown' = 'html') {
    const { data } = await this.apis.post(`/docs/${docId}/pages/${pageId}/export`, { outputFormat })

    return data
  }

  async getPageExport (docId: string, pageId: string, exportId: string) {
    try {
      const { data } = await this.apis.get(`/docs/${docId}/pages/${pageId}/export/${exportId}`)

      return data
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return {
          status: 'not found',
          downloadLink: '',
        }
      } else {
        throw err
      }
    }
  }
}
