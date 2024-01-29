import axios from 'axios'
import type { ICodaApiDoc } from './interfaces'

const apis = axios.create({
  baseURL: 'https://coda.io/apis/v1',
})

export const CodaApis = {
  async listDocs (token: string, pageToken?: string) {
    const { data } = await apis.get('/docs', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const items = data.items as ICodaApiDoc[] || []
    const nextPageToken: string | undefined = data.nextPageLink

    return {
      items,
      nextPageToken,
    }
  },
}
