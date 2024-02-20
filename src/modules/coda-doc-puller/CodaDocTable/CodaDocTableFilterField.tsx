import { type IDocFilters, useClient } from '@/modules/simple-mover/client'
import classNames from 'classnames'

export interface ICodaDocTableFilterFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  name: keyof IDocFilters
}

export function CodaDocTableFilterField ({ name, className, ...props }: ICodaDocTableFilterFieldProps) {
  const { filters, filterBy, clearFilterBy } = useClient()
  const filterValue = filters[name] || ''
  const isFilterActive = Boolean(filterValue)
  const displayName = name.replace(/([A-Z])/g, ' $1').toLowerCase()

  return (
    <div {...props} className={classNames('flex items-center rounded relative border-none', className)}>
      <input
        className='input input-xs rounded-lg border-none max-w-none bg-slate-50 focus:bg-slate-100'
        placeholder={`Filter ${displayName}`}
        value={filterValue}
        onChange={e => e.target.value ? filterBy(name, e.target.value) : clearFilterBy(name)}
      />
      {isFilterActive && (
        <label
          className='h-4 leading-4 mx-1 px-1 absolute right-0
          text-xs rounded-lg border-none cursor-pointer
          bg-slate-100 hover:bg-slate-200 text-zinc-400 hover:text-zinc-600'
          title='Clear filter'
          onClick={() => clearFilterBy(name)}
        >
          ✕
        </label>
      )}
    </div>
  )
}
