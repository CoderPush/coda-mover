import { useClient } from '@/modules/simple-mover/client'

export function CodaCheckedItemsFilter () {
  const { filterWith, clearFilterWith } = useClient()

  return (
    <label className='flex cursor-pointer gap-1 hover:bg-slate-50 items-center text-sm font-extralight'>
      <input
        className='checkbox checkbox-sm'
        type='checkbox'
        onChange={e => {
          if (e.target.checked) {
            filterWith('hide-checked-items', doc => !doc.name.includes('✅'))
          } else {
            clearFilterWith('hide-checked-items')
          }
        }}
      />
      <span className='select-none'>Hide <small>✅</small> docs</span>
    </label>
  )
}
