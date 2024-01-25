import axios from 'axios'
import type { ICodaDoc } from './interfaces'

const apis = axios.create({
  baseURL: 'https://coda.io/apis/v1',
})

export const CodaApis = {
  listDocs: async (token: string) => {
    const { data } = await apis.get('/docs', {
      headers: { Authorization: `Bearer ${token}` },
    })

    return data?.items as ICodaDoc[] || []
  },
}
