'use server'

import { CodaApis } from '../CodaApis'
import type { ICodaDoc } from '../interfaces'

interface IListDocsState {
  apiToken?: string
  message?: string
  docs?: ICodaDoc[]
}

async function listDocs (state: IListDocsState, formData: FormData): Promise<IListDocsState> {
  try {
    const apiToken = formData.get('apiToken')?.toString()
    if (!apiToken) return { apiToken: '', message: 'Please provide Coda API token' }

    const docs = await CodaApis.listDocs(apiToken)

    return {
      apiToken,
      docs,
    }
  } catch (err: any) {
    return {
      message: err.message,
    }
  }
}

export default listDocs
