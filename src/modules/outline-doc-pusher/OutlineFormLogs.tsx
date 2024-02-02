import classNames from 'classnames'
import { STATUS_IMPORT_DONE, STATUS_IMPORT_PROCESSING, useClient } from '../mover/client'

export function OutlineFormLogs () {
  const { importLogs, currentImportStatus } = useClient()
  const isVisible = currentImportStatus?.status === STATUS_IMPORT_PROCESSING ||
    currentImportStatus?.status === STATUS_IMPORT_DONE

  return (
    <div
      className={classNames(
        'outline-form__logs pl-2 overflow-y-auto',
        !isVisible && 'hidden',
      )}
    >
      {importLogs.map(log => (
        <p key={log.message} className='leading-snug flex gap-1 text-xs'>
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
          {log.message}
        </p>
      ))}
    </div>
  )
}
