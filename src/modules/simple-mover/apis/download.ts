import axios from 'axios'
import { type WriteStream } from 'fs-extra'

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
