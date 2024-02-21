import React, { type ReactNode, createContext, useContext, useState, useEffect } from 'react'
import type { IItemStatus, ICodaItem, IClient, IItemStatuses, IImportLog, IDocFilters, ICodaDoc, IDocCustomFilterFn, IDocCustomFilters } from './interfaces'
import { MoverClient } from './MoverClient'
import { CLIENT_IMPORT_OUTLINE, CLIENT_LIST_DOCS, ITEM_STATUS_DONE, ITEM_STATUS_ERROR } from './events'
import { getHiddenDocIds } from './lib/client'

// Define the shape of the MoverClientContext value
interface IMoverClientContextValue {
  items: ICodaItem[]
  selectedItemIds: string[]
  itemStatuses: Record<ICodaItem['id'], IItemStatus>
  isConnected: boolean
  isListingDocs: boolean
  isListingDone: boolean
  listDocs: IClient['listDocs']

  select: (...itemIds: string[]) => void
  deselect: (...itemIds: string[]) => void
  selectOnly: (...itemIds: string[]) => void
  selectAll: () => void
  deselectAll: () => void
  isSelectedAll: boolean

  currentImportStatus?: IItemStatus
  importIssues: string[]
  importLogs: IImportLog[]
  importToOutline: (outlineApiToken: string) => void
  confirmImport: IClient['confirmImport']
  cancelImport: IClient['cancelImport']

  openLink: IClient['openLink']

  filters: IDocFilters
  // let UI decide on show or hide items instead of update item list
  // to reduce DOM update cost
  hiddenItemIds: string[]
  filterBy: (key: keyof ICodaDoc, value: string) => void
  clearFilterBy: (key: keyof IDocFilters) => void
  filterWith: (customFilterName: string, filterFn: IDocCustomFilterFn) => void
  clearFilterWith: (customFilterName: string) => void
  clearFilters: () => void
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
  const [userSelectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isUserSelectedAll, setIsUserSelectedAll] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [mover, setMover] = useState<MoverClient | null>(null)
  const [importIssues, setImportIssues] = useState<string[]>([])
  const [importLogs, setImportLogs] = useState<IImportLog[]>([])
  const [filters, setFilters] = useState<IDocFilters>({})
  const [customFilters, setCustomFilters] = useState<IDocCustomFilters>({})

  const isListingDocs = itemStatuses[CLIENT_LIST_DOCS] && (
    itemStatuses[CLIENT_LIST_DOCS].status !== ITEM_STATUS_DONE &&
    itemStatuses[CLIENT_LIST_DOCS].status !== ITEM_STATUS_ERROR
  )
  const isListingDone = itemStatuses[CLIENT_LIST_DOCS]?.status === ITEM_STATUS_DONE
  const currentImportStatus = itemStatuses[CLIENT_IMPORT_OUTLINE]
  const itemIds = items.map(item => item.id)
  const isSelectedAll = isUserSelectedAll ||
    (itemIds.length > 0 && userSelectedItemIds.length >= itemIds.length)
  const selectedItemIds = isSelectedAll ? itemIds : userSelectedItemIds
  const hiddenItemIds = getHiddenDocIds(items as ICodaDoc[], filters, ...Object.values(customFilters))

  useEffect(() => {
    if (mover) return

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
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const context: IMoverClientContextValue = {
    items,
    selectedItemIds,
    itemStatuses,
    isConnected,
    isListingDocs,
    isListingDone,
    currentImportStatus,
    importIssues,
    importLogs,
    isSelectedAll,
    filters,
    hiddenItemIds,
    listDocs: (codaApiToken: string) => mover?.listDocs(codaApiToken),
    select (...itemIds) {
      setSelectedItemIds(selectedItemIds => [...selectedItemIds, ...itemIds])
    },
    deselect (...deselectedItemIds) {
      setSelectedItemIds(selectedItemIds => {
        if (isSelectedAll) selectedItemIds = itemIds

        return selectedItemIds.filter(id => !deselectedItemIds.includes(id))
      })
      setIsUserSelectedAll(false)
    },
    selectOnly (...itemIds) {
      setSelectedItemIds(itemIds)
    },
    selectAll () {
      setIsUserSelectedAll(true)
    },
    deselectAll () {
      setSelectedItemIds([])
      setIsUserSelectedAll(false)
    },
    importToOutline: (outlineApiToken: string) => mover?.importToOutline(outlineApiToken, selectedItemIds),
    confirmImport: () => mover?.confirmImport(),
    cancelImport: () => mover?.cancelImport(),
    openLink: (url) => mover?.openLink(url),
    filterBy (key, value) {
      setFilters(filters => ({ ...filters, [key]: value }))
    },
    clearFilterBy (key) {
      setFilters(filters => {
        const { [key]: _, ...others } = filters

        return others
      })
    },
    filterWith (customFilterName, filterFn) {
      setCustomFilters(customFilters => ({ ...customFilters, [customFilterName]: filterFn }))
    },
    clearFilterWith (customFilterName) {
      setCustomFilters(customFilters => {
        const { [customFilterName]: _, ...others } = customFilters

        return others
      })
    },
    clearFilters () {
      setFilters({})
    },
  }

  return (
    <MoverClientContext.Provider value={context}>
      {children}
    </MoverClientContext.Provider>
  )
}
