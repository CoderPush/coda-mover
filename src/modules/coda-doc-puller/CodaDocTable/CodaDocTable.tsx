import { type ICodaDoc, useClient } from '@/modules/simple-mover/client'
import './CodaDocTable.scss'
import { CodaDocTableItem } from './CodaDocTableItem'
import classNames from 'classnames'
import { CodaDocTableFilterField } from './CodaDocTableFilterField'

export interface ICodaDocTableProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CodaDocTable ({ className, ...props }: ICodaDocTableProps) {
  const { items } = useClient()

  return (
    <div {...props} className={classNames('flex w-full overflow-x-auto', className)}>
      <table className='table table-compact table--scrollbody'>
        <thead className='shadow-sm'>
          <tr className='table__headers'>
            <th className='table-col--checkbox' />
            <th>Name</th>
            <th className='w-10'>Folder</th>
            <th className='w-10'>Owner</th>
            <th className='w-6' />
          </tr>
          <tr className='table__filters'>
            <th />
            <th>
              <CodaDocTableFilterField name='name' />
            </th>
            <th>
              <CodaDocTableFilterField name='folder' />
            </th>
            <th>
              <CodaDocTableFilterField name='owner' />
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
