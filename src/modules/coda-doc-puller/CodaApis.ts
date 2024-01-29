import axios from 'axios'
import type { ICodaApiDoc, ICodaApiPage } from './interfaces'

const apis = axios.create({
  baseURL: 'https://coda.io/apis/v1',
})

export const CodaApis = {
  async listDocs (token: string, pageToken?: string) {
    const params = pageToken ? { pageToken } : { limit: 100 }
    const { data } = await apis.get('/docs', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })

    const items = data.items as ICodaApiDoc[] || []
    const nextPageToken: string | undefined = data.nextPageToken

    return {
      items,
      nextPageToken,
    }
  },
  async listPagesForDoc (token: string, docId: string, pageToken?: string) {
    const params = pageToken ? { pageToken } : { limit: 50 }
    const { data } = await apis.get(`/docs/${docId}/pages`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    })

    const items = data.items as ICodaApiPage[] || []
    const nextPageToken: string | undefined = data.nextPageToken

    return {
      items,
      nextPageToken,
    }
  },
}
