import React, { type ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { type IItemStatus, type ICodaItem, type ICodaItems, type IMoverClient, type IImportLog } from './interfaces'
import { MoverClient } from './MoverClient'
import { CLIENT_SYNC_DOCS } from './events'

// Define the shape of the MoverClientContext value
interface IMoverClientContextValue {
  items: ICodaItems
  selectedItemIds: string[]
  itemStatuses: Record<ICodaItem['id'], IItemStatus>
  isConnected: boolean
  isSyncingDocs: boolean
  syncDocs: IMoverClient['syncDocs']

  select: IMoverClient['select']
  deselect: IMoverClient['deselect']

  importId: string
  importIssues: string[]
  importLogs: IImportLog[]
  currentImportStatus?: IItemStatus
  importToOutline: (apiToken: string) => void
  confirmImport: () => void
  cancelImport: () => void
}

// Create the MoverClientContext
const MoverClientContext = createContext<IMoverClientContextValue | undefined>(undefined)

// Create a custom hook to access the MoverClientContext value
export const useClient = (): IMoverClientContextValue => {
  const context = useContext(MoverClientContext)
  if (!context) {
    throw new Error('useClient must be used within <MoverClientProvider>')
  }

  return context
}

// Create the MoverClientProvider component
export function MoverClientProvider ({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ICodaItems>([])
  const [itemStatuses, setItemStatuses] = useState<Record<ICodaItem['id'], IItemStatus>>({})
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [importId, setImportId] = useState<string>('')
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importLogs, setImportLogs] = useState<IImportLog[]>([])
  const [mover, setMover] = useState<MoverClient | null>(null)
  const isSyncingDocs = itemStatuses[CLIENT_SYNC_DOCS]?.status === 'listing'
  const currentImportStatus = itemStatuses[`import:${importId}`]

  useEffect(() => {
    if (mover) return

    // Ensure mover server started
    fetch('/api/mover').then(() => {
      const client = new MoverClient({
        onConnection: state => setIsConnected(state === 'opened'),
        onItems: items => setItems(items),
        onStatuses: itemStatuses => setItemStatuses(itemStatuses),
        onSelectionChange: selectedItemIds => setSelectedItemIds(selectedItemIds),
        onImportIssues: issues => setImportIssues(issues),
        onImportLogs: logs => setImportLogs(logs),
      })

      client.handleServerResponses()

      setMover(client)
    }).catch(err => {
      console.error(err)
    })
  })

  const context: IMoverClientContextValue = {
    items,
    selectedItemIds,
    itemStatuses,
    isConnected,
    isSyncingDocs,
    importId,
    importIssues,
    importLogs,
    currentImportStatus,
    syncDocs: (apiToken: string) => mover?.syncDocs(apiToken),
    select: (...itemIds) => mover?.select(...itemIds),
    deselect: (...itemIds) => mover?.deselect(...itemIds),
    importToOutline: (apiToken: string) => {
      const importId = Date.now().toString()

      setImportId(importId)
      mover?.importToOutline(importId, apiToken)
    },
    confirmImport: () => {
      if (!importId) throw Error('Import should be requested with importToOutline')
      if (currentImportStatus?.status !== 'confirming') {
        setItemStatuses(itemStatuses => ({
          ...itemStatuses,
          [importId]: {
            id: `import:${importId}`,
            status: 'error',
            message: 'Import is not in confirming state',
          },
        }))
      }

      mover?.confirmImport(importId)
    },
    cancelImport: () => {
      setImportId('')
      setImportIssues([])
      setImportLogs([])
    },
  }

  return (
    <MoverClientContext.Provider value={context}>
      {children}
    </MoverClientContext.Provider>
  )
}
