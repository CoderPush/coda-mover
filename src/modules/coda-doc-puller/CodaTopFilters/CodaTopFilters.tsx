import classNames from 'classnames'
import { CodaCheckedItemsFilter } from './CodaCheckedItemsFilter'
import { useClient } from '@/modules/simple-mover/client'

export interface ICodaTopFiltersProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CodaTopFilters ({ className, ...props }: ICodaTopFiltersProps) {
  const { items, isListingDone } = useClient()
  const isHidden = !isListingDone || !items.length

  return (
    <div {...props} className={classNames('flex gap-2 items-center', isHidden && 'hidden', className)}>
      <h5 className='text-sm'>Filters:</h5>
      <CodaCheckedItemsFilter />
    </div>
  )
}
