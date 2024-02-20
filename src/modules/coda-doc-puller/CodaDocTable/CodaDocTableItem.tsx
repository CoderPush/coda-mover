import { OutlinePushBtn } from '@/modules/outline-doc-pusher/OutlinePushBtn'
import { useClient, type ICodaDoc } from '@/modules/simple-mover/client'
import classNames from 'classnames'

export interface ICodaDocTableItemProps extends React.HTMLAttributes<HTMLTableRowElement> {
  data: ICodaDoc
}

export function CodaDocTableItem ({ className, data, ...props }: ICodaDocTableItemProps) {
  const { openLink, selectedItemIds, deselect, select, selectOnly, hiddenItemIds } = useClient()
  const isSelected = selectedItemIds.includes(data.id)
  const isHidden = hiddenItemIds.includes(data.id)

  return (
    <tr {...props} className={classNames('hover:bg-slate-50', isHidden && 'hidden', className)}>
      <th>
        <input
          type='checkbox'
          className='checkbox'
          checked={isSelected}
          onChange={() => isSelected ? deselect(data.id) : select(data.id)}
        />
      </th>
      <td className='table-col--text'>
        <a
          onClick={() => openLink(data.browserLink)}
          href='#'
          title={data.name}
        >
          {data.name}
        </a>
      </td>
      <td className='table-col--text'>
        {data.folderName && (
          <a
            onClick={() => openLink(data.folderBrowserLink)}
            href='#'
            title={data.folderName}
          >{data.folderName}
          </a>)}
      </td>
      <td className='table-col--text'>{data.ownerName}</td>
      <td>
        <OutlinePushBtn variant='icon' onClick={() => selectOnly(data.id)} />
      </td>
    </tr>
  )
}
