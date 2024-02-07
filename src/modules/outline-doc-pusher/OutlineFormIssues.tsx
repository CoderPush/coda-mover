import classNames from 'classnames'
import { ITEM_STATUS_CONFIRMING, ITEM_STATUS_VALIDATING, useClient } from '@/modules/simple-mover/client'

export function OutlineFormIssues () {
  const { importIssues, currentImportStatus } = useClient()
  const isVisible = currentImportStatus?.status === ITEM_STATUS_VALIDATING ||
    currentImportStatus?.status === ITEM_STATUS_CONFIRMING

  return (
    <div
      className={classNames(
        'outline-form__issues pl-2 overflow-y-auto',
        !isVisible && 'hidden',
      )}
    >
      {importIssues.map(issue => (
        <p key={issue} className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          {issue}
        </p>
      ))}
    </div>
  )
}
