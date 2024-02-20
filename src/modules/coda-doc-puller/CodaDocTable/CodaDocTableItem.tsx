import { OutlinePushBtn } from '@/modules/outline-doc-pusher/OutlinePushBtn'
import { useClient, type ICodaDoc } from '@/modules/simple-mover/client'
import classNames from 'classnames'

export interface ICodaDocTableItemProps extends React.HTMLAttributes<HTMLTableRowElement> {
  data: ICodaDoc
}

export function CodaDocTableItem ({ className, data, ...props }: ICodaDocTableItemProps) {
  const { openLink, selectedItemIds, deselect, select } = useClient()
  const isSelected = selectedItemIds.includes(data.id)

  return (
    <tr {...props} className={classNames('hover:bg-slate-50', className)}>
      <th>
        <input
          type='checkbox'
          className='checkbox'
          checked={isSelected}
          onChange={() => isSelected ? deselect(data.id) : select(data.id)}
        />
      </th>
      <td>
        <a
          onClick={() => openLink(data.browserLink)}
          href='#'
          title={data.name}
        >
          {data.name}
        </a>
      </td>
      <td>
        {data.folderName && (
          <a
            onClick={() => openLink(data.folderBrowserLink)}
            href='#'
            title={data.folderName}
          >{data.folderName}
          </a>)}
      </td>
      <td>{data.ownerName}</td>
      <td>
        <OutlinePushBtn variant='icon' />
      </td>
    </tr>
  )
}
