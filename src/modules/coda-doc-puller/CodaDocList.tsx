import type { HTMLAttributes } from 'react'
import type { ICodaItems } from './interfaces'
import { CodaItem } from './CodaItem'
import { CLIENT_SYNC_DOCS, type IItemStatuses } from '../mover'

export interface ICodaDocListProps extends HTMLAttributes<HTMLElement> {
  items: ICodaItems
  statuses: IItemStatuses
}

export function CodaDocList ({ items, className, statuses }: ICodaDocListProps) {
  const docs = items.filter(item => item.treePath === '/')
  const isLoading = statuses[CLIENT_SYNC_DOCS]?.status !== 'done'

  return (
    <section className={`menu-section ${className}`}>
      {!isLoading && (<span className='menu-title'>Found {items.length} docs</span>)}
      <menu className='menu-items gap-1'>
        {docs.map(doc => (
          <CodaItem key={doc.id} data={doc} items={items} />
        ))}
      </menu>
    </section>
  )
}
