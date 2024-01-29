import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import { type Socket } from 'socket.io'
import { ensureDir, pathExists, readJson, rename, writeJson } from 'fs-extra'
import { resolve } from 'path'
import { CLIENT_SYNC_DOCS, ITEM_STATUS, SERVER_RETURN_DOCS } from './events'
import { CodaApis } from '../coda-doc-puller/CodaApis'
import type { ICodaDoc, ICodaItem, ICodaItems, ICodaApiDoc } from './interfaces'

const rootPath = resolve(__dirname, '../../../../').replace(/\\/g, '/') // fix path separator for windows
const dataPath = `${rootPath}/data`
const codaJsonPath = `${dataPath}/coda.json`
const codaDocsPath = `${dataPath}/docs`

export class MoverServer {
  readonly tasks = new TaskEmitter({
    concurrency: 3,
    onItemError: (item, error) => {
      console.error('[mover]', item.id, 'error', error)
      this.notifyStatus(item.id!, 'error', error.message)
    },
    onItemDone: item => {
      this.notifyStatus(item.id!, 'done')
    },
  })

  private _socket: Socket | undefined
  private items: Record<string, ICodaItem> = {}

  get socket (): Socket {
    if (!this._socket) {
      throw Error('[mover] socket needs to be provided using \'handleClientRequests\'')
    }

    return this._socket
  }

  async handleClientRequests (socket: Socket) {
    // ensure old listeners detached when replacing socket
    if (this._socket) this._socket.removeAllListeners()
    this._socket = socket

    try {
      await this.loadPreviouslySyncedData()

      this.handleClientSyncDocs()
    } catch (err: any) {
      console.error('[mover] handle requests', err)
      this.notifyStatus('handle requests', 'error', err.message as string)
    }
  }

  async loadPreviouslySyncedData () {
    // ensure folder structure for saving data
    await ensureDir(codaDocsPath)

    const codaJsonPathExists = await pathExists(codaJsonPath)
    if (!codaJsonPathExists) return
    // attempt loading previously synced data
    const items: ICodaItems = await readJson(codaJsonPath)

    this.items = items.reduce<Record<string, ICodaItem>>((indexedItems, item) => {
      indexedItems[item.id] = item

      return indexedItems
    }, {})
  }

  handleClientSyncDocs () {
    this.socket.on(CLIENT_SYNC_DOCS, async (apiToken: string) => {
      const apiDocs = await CodaApis.listDocs(apiToken)
      const docs: ICodaDoc[] = apiDocs.map(doc => ({
        id: doc.id,
        name: doc.name,
        treePath: '/',
      }))

      this.socket.emit(SERVER_RETURN_DOCS, docs)

      apiDocs.forEach(doc => this.tasks.add({
        id: doc.id,
        context: {},
        execute: async () => await this.syncDoc(doc),
      }))

      this.notifyStatus(CLIENT_SYNC_DOCS, 'done')
      this.queuePersistingData()
      this.tasks.next()
    })
  }

  private async syncDoc (doc: ICodaApiDoc) {
    const syncedDoc = this.items[doc.id]
    const docFilePath = `${codaDocsPath}/${doc.name}`
    const updatedDoc = {
      id: doc.id,
      name: doc.name,
      treePath: '/',
      syncedAt: this.getCurrentIsoDateTime(),
      filePath: docFilePath,
    }

    if (!syncedDoc?.filePath) { // new doc
      this.notifyStatus(doc.id, 'saving')
    } else if (!syncedDoc.syncedAt || syncedDoc.syncedAt < doc.updatedAt) { // doc outdated
      await this.revalidateSyncedDoc(syncedDoc, updatedDoc)
    }

    this.items[doc.id] = updatedDoc
    await ensureDir(updatedDoc.filePath)
  }

  private async revalidateSyncedDoc (syncedDoc: ICodaDoc, updatedDoc: ICodaDoc) {
    this.notifyStatus(syncedDoc.id, 'validating')
    if (syncedDoc.filePath === updatedDoc.filePath) return

    const syncedPathExists = await pathExists(syncedDoc.filePath!)
    if (syncedPathExists) {
      await rename(syncedDoc.filePath!, updatedDoc.filePath!)
    }

    // TODO: update inner pages filePath
  }

  queuePersistingData () {
    this.tasks.add({
      id: 'persist coda.json',
      context: {},
      execute: async () => {
        await writeJson(codaJsonPath, Object.values(this.items))
      },
      priority: TaskPriority.IDLE,
    })
  }

  private notifyStatus (item: string, status: string, message?: string) {
    this.socket.emit(ITEM_STATUS, { id: item, status, message })
  }

  private getCurrentIsoDateTime () {
    return (new Date()).toISOString()
  }
}
