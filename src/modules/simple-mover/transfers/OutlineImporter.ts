import { TaskEmitter, TaskPriority } from '@abxvn/tasks'
import {
  CLIENT_IMPORT_OUTLINE,
  ITEM_STATUS_CONFIRMING,
  ITEM_STATUS_ERROR,
  ITEM_STATUS_VALIDATING,
} from '../events'
import type { ICodaItem, IImporter, IMover, IOutlineApis, IStatus } from '../interfaces'
import { isAxiosError } from 'axios'

const DEFAULT_COLLECTION_NAME = 'Coda'

export class OutlineImporter implements IImporter {
  private collectionId: string | undefined
  private readonly tasks = new TaskEmitter({
    concurrency: 5,
    onItemError: (item, error) => {
      const isRateLimitError = isAxiosError(error) && error.response?.status === 429
      if (isRateLimitError) this.tasks.add({ ...item, priority: TaskPriority.LOW })

      this.setStatus(item.id!, ITEM_STATUS_ERROR, error.message)
    },
  })

  constructor (
    private readonly mover: IMover,
    private readonly apis: IOutlineApis,
    private readonly items: ICodaItem[],
    private readonly collectionName = DEFAULT_COLLECTION_NAME,
  ) {}

  async validateImport () {
    try {
      const selectedDocs = this.items.filter(item => item.treePath === '/')
      if (!selectedDocs.length) throw Error('No docs selected for import')

      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_VALIDATING)

      // TODO: only deal with max 100 collections
      // Please provide pagination for larger number of collections
      const collections = await this.apis.listCollections()
      const selectedCollection = collections.find(col => col.name === this.collectionName)

      if (!selectedCollection) {
        this.mover.returnImportIssues(
          `Private collection '${this.collectionName}' will be created`,
          'All docs and pages will be imported as brand new items',
        )
      } else {
        if (!selectedCollection.permission !== null) {
          this.mover.returnImportIssues(
            `Collection '${this.collectionName}' exists and not private`,
          )
        }

        this.collectionId = selectedCollection.id
      }

      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_CONFIRMING)
    } catch (err: any) {
      this.setStatus(CLIENT_IMPORT_OUTLINE, ITEM_STATUS_ERROR, err.message as string)
    }
  }

  private setStatus (id: string, status: IStatus, message?: string) {
    this.mover.setStatus(id, status, message)
  }

  stopPendingImports () {
    this.tasks.dispose()
  }
}
