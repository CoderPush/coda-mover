import axios, { isAxiosError } from 'axios'
import type { ICodaApiDoc, ICodaApiPage } from './interfaces'
import { type WriteStream } from 'fs-extra'

const apis = axios.create({
  baseURL: 'https://coda.io/apis/v1',
})

export const download = async (url: string, stream: WriteStream) => {
  return await axios.get(url, {
    responseType: 'stream',
  }).then(async response => {
    return await new Promise((resolve, reject) => {
      response.data.pipe(stream)
      stream.on('error', err => {
        stream.close()
        reject(err)
      })
      stream.on('close', () => {
        resolve(true)
      })
    })
  })
}

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
  async exportPage (
    token: string,
    docId: string,
    pageId: string,
    outputFormat: 'html' | 'markdown' = 'html'
  ): Promise<{ id: string, status: string }> {
    const { data } = await apis.post(
      `/docs/${docId}/pages/${pageId}/export`,
      { outputFormat },
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    return data
  },
  async getPageExport (
    token: string,
    docId: string,
    pageId: string,
    exportId: string,
  ): Promise<{ status: string, downloadLink: string }> {
    try {
      const { data } = await apis.get(`/docs/${docId}/pages/${pageId}/export/${exportId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      return data
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) {
        return {
          status: 'not-found',
          downloadLink: '',
        }
      } else {
        throw err
      }
    }
  },
}
