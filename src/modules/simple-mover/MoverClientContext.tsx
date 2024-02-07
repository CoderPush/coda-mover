import React, { type ReactNode, createContext, useContext, useState, useEffect } from 'react'
import type { IItemStatus, ICodaItem, IClient, IItemStatuses, IImportLog } from './interfaces'
import { MoverClient } from './MoverClient'
import { CLIENT_IMPORT_OUTLINE, CLIENT_LIST_DOCS, ITEM_STATUS_DONE, ITEM_STATUS_ERROR } from './events'

// Define the shape of the MoverClientContext value
interface IMoverClientContextValue {
  items: ICodaItem[]
  selectedItemIds: string[]
  itemStatuses: Record<ICodaItem['id'], IItemStatus>
  isConnected: boolean
  isListingDocs: boolean
  listDocs: IClient['listDocs']

  select: IClient['select']
  deselect: IClient['deselect']

  currentImportStatus?: IItemStatus
  importIssues: string[]
  importLogs: IImportLog[]
  importToOutline: IClient['importToOutline']
  confirmImport: IClient['confirmImport']
  cancelImport: IClient['cancelImport']
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
  const [items, setItems] = useState<ICodaItem[]>([])
  const [itemStatuses, setItemStatuses] = useState<IItemStatuses>({})
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [mover, setMover] = useState<MoverClient | null>(null)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importLogs, setImportLogs] = useState<IImportLog[]>([])
  const isListingDocs = itemStatuses[CLIENT_LIST_DOCS] && (
    itemStatuses[CLIENT_LIST_DOCS].status !== ITEM_STATUS_DONE &&
    itemStatuses[CLIENT_LIST_DOCS].status !== ITEM_STATUS_ERROR
  )
  const currentImportStatus = itemStatuses[CLIENT_IMPORT_OUTLINE]

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
    isListingDocs,
    currentImportStatus,
    importIssues,
    importLogs,
    listDocs: (codaApiToken: string) => mover?.listDocs(codaApiToken),
    select: (...itemIds) => mover?.select(...itemIds),
    deselect: (...itemIds) => mover?.deselect(...itemIds),
    importToOutline: (outlineApiToken: string) => mover?.importToOutline(outlineApiToken),
    confirmImport: () => mover?.confirmImport(),
    cancelImport: () => mover?.cancelImport(),
  }

  return (
    <MoverClientContext.Provider value={context}>
      {children}
    </MoverClientContext.Provider>
  )
}
