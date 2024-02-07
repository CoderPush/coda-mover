import type { HTMLAttributes } from 'react'
import { CLIENT_LIST_DOCS, ITEM_STATUS_DONE, useClient } from '@/modules/simple-mover/client'
import { CodaItem } from './CodaItem'

export interface ICodaDocListProps extends HTMLAttributes<HTMLElement> {}

export function CodaDocList ({ className }: ICodaDocListProps) {
  const { items, itemStatuses } = useClient()
  let docs = items.filter(item => item.treePath === '/')
  const isItemCountVisible = itemStatuses[CLIENT_LIST_DOCS]?.status === ITEM_STATUS_DONE

  if (!isItemCountVisible) {
    docs = []
  }

  return (
    <section className={`menu-section flex flex-col overflow-hidden ${className}`}>
      {isItemCountVisible && (
        <span className='menu-title'>
          Found {docs.length} docs
        </span>
      )}
      <menu className='menu-items gap-1 overflow-y-auto'>
        {docs.map(doc => (<CodaItem key={doc.id} data={doc} />))}
      </menu>
    </section>
  )
}
