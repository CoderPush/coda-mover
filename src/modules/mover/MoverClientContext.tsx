import React, { type ReactNode, createContext, useContext, useState, useEffect } from 'react'
import { type IItemStatus, type ICodaItem, type ICodaItems, type IMoverClient } from './interfaces'
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
  const [mover, setMover] = useState<MoverClient | null>(null)
  const isSyncingDocs = itemStatuses[CLIENT_SYNC_DOCS]?.status === 'listing'

  useEffect(() => {
    if (mover) return

    // Ensure mover server started
    fetch('/api/mover').then(() => {
      const client = new MoverClient({
        onConnection: state => setIsConnected(state === 'opened'),
        onItems: items => setItems(items),
        onStatuses: itemStatuses => setItemStatuses(itemStatuses),
        onSelectionChange: (selectedItemIds) => setSelectedItemIds(selectedItemIds),
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
    syncDocs: (apiToken: string) => mover?.syncDocs(apiToken),
    select: (...itemIds) => mover?.select(...itemIds),
    deselect: (...itemIds) => mover?.deselect(...itemIds),
  }

  return (
    <MoverClientContext.Provider value={context}>
      {children}
    </MoverClientContext.Provider>
  )
}
