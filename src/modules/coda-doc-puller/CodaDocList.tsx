import type { HTMLAttributes } from 'react'
import { CLIENT_SYNC_DOCS, useClient } from '../mover/client'
import { CodaItem } from './CodaItem'

export interface ICodaDocListProps extends HTMLAttributes<HTMLElement> {}

export function CodaDocList ({ className }: ICodaDocListProps) {
  const { items, itemStatuses } = useClient()
  const docs = items.filter(item => item.treePath === '/')
  const isLoading = itemStatuses[CLIENT_SYNC_DOCS]?.status !== 'done'

  return (
    <section className={`menu-section flex flex-col overflow-hidden ${className}`}>
      {!isLoading && (
        <span className='menu-title'>
          Found {docs.length} docs and {items.length - docs.length} pages
        </span>
      )}
      <menu className='menu-items gap-1 overflow-y-auto'>
        {docs.map(doc => (<CodaItem key={doc.id} data={doc} />))}
      </menu>
    </section>
  )
}
