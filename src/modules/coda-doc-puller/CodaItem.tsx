import type { HTMLAttributes } from 'react'
import type { ICodaItem, ICodaItems } from './interfaces'

export interface ICodaItemProps extends HTMLAttributes<HTMLLIElement> {
  data: ICodaItem
  items: ICodaItems
}

export function CodaItem ({ data, items }: ICodaItemProps) {
  const innerPages = items.filter(item => item.treePath === `/${data.id}/`)
  const hasInnerPages = innerPages.length > 0

  return (
    <li key={data.id}>
      {hasInnerPages && <input type='checkbox' id={`toggle--${data.id}`} className='menu-toggle [&:defaultChecked~.menu-item>.menu-icon]:-rotate-90' />}
      <div className='flex items-center'>
        <input type='checkbox' className='checkbox' />
        <label className='menu-item menu-item-no-animation justify-between grow px-3 ml-2' htmlFor={`toggle--${data.id}`}>
          <span>{data.name}</span>
          {hasInnerPages && (
            <span className='menu-icon'>
              <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' className='w-4 h-4 stroke-content3'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
              </svg>
            </span>
          )}

        </label>
      </div>

      {hasInnerPages && (
        <div className='menu-item-collapse pl-4 bg-slate-200/50'>
          <ul className='min-h-0'>
            {innerPages.map(page => (
              <CodaItem key={page.id} data={page} items={items} />
            ))}
          </ul>
        </div>
      )}
    </li>
  )
}
