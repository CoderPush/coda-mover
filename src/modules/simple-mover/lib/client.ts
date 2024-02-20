// for client

import type { ICodaDoc, IDocFilters } from '../interfaces'

export const getHiddenDocIds = (docs: ICodaDoc[], filters: IDocFilters) => {
  const filterKeys = Object.keys(filters) as Array<keyof IDocFilters>

  return docs.reduce<string[]>((hiddenIds, doc) => {
    const isHidden = filterKeys.some(key => {
      const filterValue = filters[key]
      if (!filterValue) return false

      return !doc[key]?.toLowerCase().includes(filterValue.toLowerCase())
    })

    if (isHidden) {
      hiddenIds.push(doc.id)
    }

    return hiddenIds
  }, [])
}
