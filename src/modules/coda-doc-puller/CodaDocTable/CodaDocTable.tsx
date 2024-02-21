import { type ICodaDoc, useClient } from '@/modules/simple-mover/client'
import './CodaDocTable.scss'
import { CodaDocTableItem } from './CodaDocTableItem'
import classNames from 'classnames'
import { CodaDocTableFilterField } from './CodaDocTableFilterField'

export interface ICodaDocTableProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CodaDocTable ({ className, ...props }: ICodaDocTableProps) {
  const { items, isSelectedAll, deselectAll, selectAll, isListingDone } = useClient()
  const isHidden = !isListingDone
  const isNoItems = !items.length

  return (
    <div
      {...props}
      className={classNames(
        'flex flex-col w-full overflow-x-auto',
        isHidden && 'hidden',
        className
      )}
    >
      {isNoItems && (<p className='text-zinc-400'>No docs found :(</p>)}
      <table className={classNames('table table-compact table--scrollbody', isNoItems && 'hidden')}>
        <thead className='shadow-sm'>
          <tr className='table__headers'>
            <th className='w-8'>
              <input
                type='checkbox'
                className='checkbox'
                checked={isSelectedAll}
                onChange={() => isSelectedAll ? deselectAll() : selectAll()}
              />
            </th>
            <th className='table-col--text'>Name</th>
            <th className='w-10 table-col--text'>Folder</th>
            <th className='w-10 table-col--text'>Owner</th>
            <th className='w-6' />
          </tr>
          <tr className='table__filters'>
            <th className='!text-center' title={`Found ${items.length} docs`}>
              <span className='border-none text-indigo-300'>{items.length}</span>
            </th>
            <th>
              <CodaDocTableFilterField name='name' />
            </th>
            <th>
              <CodaDocTableFilterField name='folderName' />
            </th>
            <th>
              <CodaDocTableFilterField name='ownerName' />
            </th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (<CodaDocTableItem key={item.id} data={item as ICodaDoc} />))}
        </tbody>
      </table>
    </div>
  )
}
