import type { HTMLAttributes } from 'react'
import type { ICodaDoc } from './interfaces'

export interface ICodaDocListProps extends HTMLAttributes<HTMLElement> {
  items: ICodaDoc[]
}

export function CodaDocList ({ items, className }: ICodaDocListProps) {
  return (
    <section className={`menu-section ${className}`}>
      <span className='menu-title'>Found {items.length} docs</span>
      <menu className='menu-items gap-1'>
        {items.map(doc => (
          <li key={doc.id}>
            <input type='checkbox' id={`toggle--${doc.id}`} className='menu-toggle [&:defaultChecked~.menu-item>.menu-icon]:-rotate-90' />
            <div className='flex items-center'>
              <input type='checkbox' className='checkbox' />
              <label className='menu-item menu-item-no-animation justify-between grow px-3 ml-2' htmlFor={`toggle--${doc.id}`}>
                <span>{doc.name}</span>
                <span className='menu-icon'>
                  <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' className='w-4 h-4 stroke-content3'>
                    <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
                  </svg>
                </span>
              </label>
            </div>

            <div className='menu-item-collapse pl-4 bg-slate-200/50'>
              <ul className='min-h-0'>
                <li>
                  <input type='checkbox' id='menu-3' className='menu-toggle [&:defaultChecked~.menu-item>.menu-icon]:-rotate-90' />
                  <div className='flex items-center'>
                    <input type='checkbox' className='checkbox' />
                    <label className='menu-item menu-item-no-animation justify-between grow px-3 ml-2' htmlFor='menu-3'>
                      <span>Billing</span>
                      <span className='menu-icon'>
                        <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth='1.5' className='w-4 h-4 stroke-content3'>
                          <path strokeLinecap='round' strokeLinejoin='round' d='M8.25 4.5l7.5 7.5-7.5 7.5' />
                        </svg>
                      </span>
                    </label>
                  </div>
                  <div className='menu-item-collapse pl-4 bg-slate-200/50'>
                    <ul className='min-h-0'>
                      <li className='flex items-center'>
                        <input type='checkbox' className='checkbox' />
                        <label className='menu-item menu-item-no-animation grow px-3 ml-2'>Security</label>
                      </li>
                    </ul>
                  </div>
                </li>
                <li className='flex items-center'>
                  <input type='checkbox' className='checkbox' />
                  <label className='menu-item menu-item-no-animation grow px-3 ml-2'>Security</label>
                </li>
              </ul>
            </div>
          </li>
        ))}
      </menu>
    </section>
  )
}
