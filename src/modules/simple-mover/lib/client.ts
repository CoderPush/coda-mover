// for client

import type { ICodaDoc, IDocCustomFilterFn, IDocFilters } from '../interfaces'

export const getHiddenDocIds = (docs: ICodaDoc[], filters: IDocFilters, ...customFilters: IDocCustomFilterFn[]) => {
  const filterKeys = Object.keys(filters) as Array<keyof IDocFilters>
  const hiddenDocIds = docs.reduce<string[]>((hiddenIds, doc) => {
    let isHidden = filterKeys.some(key => {
      const filterValue = filters[key]
      if (!filterValue) return false

      return !doc[key]?.toLowerCase().includes(filterValue.toLowerCase())
    })

    if (!isHidden && customFilters.length) isHidden = customFilters.some(filter => !filter(doc))
    if (isHidden) hiddenIds.push(doc.id)

    return hiddenIds
  }, [])

  return hiddenDocIds
}
