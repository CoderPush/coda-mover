import type { HTMLAttributes } from 'react'
import { useClient, type ICodaItem } from '../mover/client'
import { CodaItemStatus } from './CodaItemStatus'

export interface ICodaItemProps extends HTMLAttributes<HTMLLIElement> {
  data: ICodaItem
}

export function CodaItem ({ data }: ICodaItemProps) {
  const { select, deselect, items, itemStatuses: statuses, selectedItemIds } = useClient()
  const innerPages = items.filter(item => item.treePath === `${data.treePath}${data.id}/`)
  const hasInnerPages = innerPages.length > 0
  const isSelected = selectedItemIds.includes(data.id)
  const itemStatus = statuses[data.id]
  const innerPageStatuses = innerPages.map(page => statuses[page.id]?.status).flat()
  const message = itemStatus?.message
  let status = itemStatus?.status

  if (!status || status === 'done') {
    if (innerPageStatuses.includes('error')) {
      status = 'error in pages'
    } else if (innerPageStatuses.includes('saving')) {
      status = 'saving pages'
    }
  }

  return (
    <li key={data.id} data-id={data.id} className='flex items-center flex-wrap'>
      {hasInnerPages && <input type='checkbox' id={`toggle--${data.id}`} className='menu-toggle [&:defaultChecked~.flex>.menu-icon]:-rotate-90' />}
      <input
        type='checkbox'
        className='checkbox'
        checked={isSelected}
        onChange={() => isSelected ? deselect(data.id) : select(data.id)}
      />
      <label className='menu-item menu-item-no-animation basis-11/12 overflow-hidden justify-between grow px-3 ml-2' htmlFor={`toggle--${data.id}`}>
        <span className='text-ellipsis whitespace-nowrap overflow-hidden grow'>{data.name}</span>
        <CodaItemStatus status={status} message={message} />
        {hasInnerPages && (
          <span className='menu-icon'>
            <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' className='w-4 h-4 stroke-content3'>
              <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
            </svg>
          </span>
        )}
      </label>

      {hasInnerPages && (
        <div className='menu-item-collapse pl-4 bg-slate-200/70 grow'>
          <ul className='min-h-0'>
            {innerPages.map(page => (
              <CodaItem key={page.id} data={page} />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
