import classNames from 'classnames'
import { ITEM_STATUS_DONE, ITEM_STATUS_IMPORTING, useClient } from '@/modules/simple-mover/client'

export function OutlineFormLogs () {
  const { importLogs, currentImportStatus } = useClient()
  const isVisible = currentImportStatus?.status === ITEM_STATUS_IMPORTING ||
    currentImportStatus?.status === ITEM_STATUS_DONE

  if (!isVisible) return null

  return (
    <ul
      className={classNames(
        'outline-form__logs pl-2 pr-4 overflow-y-auto',
        !isVisible && 'hidden',
      )}
    >
      {importLogs.map(log => (
        <li
          key={log.id}
          className={classNames(
            'leading-snug flex flex-wrap gap-x-1 gap-y-0.5 text-xs',
            log.level === 'error' && 'text-error',
          )}
        >
          <span
            className={classNames(
              'w-4 h-4 text-center mr-1',
              log.level === 'success' && 'text-success',
              log.level === 'error' && 'text-error',
              log.level === 'info' && 'text-indigo-500',
            )}
          >
            {log.level === 'success' && '✓'}
            {log.level === 'error' && '!'}
            {log.level === 'info' && '»'}
          </span>
          {log.name && (<h5 className='font-medium grow basis-3/4 truncate'>{log.name}</h5>)}
          <p
            className={classNames(
              'mt-0 leading-snug truncate',
              log.name && 'ml-6 text-zinc-500'
            )}
          >
            {log.message.replace(/,.+/, '').replace(log.name!, '')}
          </p>
        </li>
      ))}
    </ul>
  )
}
