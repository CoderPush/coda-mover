'use client'

import { useEffect } from 'react'
import { ITEM_STATUS_DONE, ITEM_STATUS_ERROR, ITEM_STATUS_IMPORTING, useClient } from '@/modules/simple-mover/client'
import { OutlineFormIssues } from './OutlineFormIssues'
import { OutlineFormLogs } from './OutlineFormLogs'
import { OutlineFormStatus } from './OutlineFormStatus'
import classNames from 'classnames'
import { useLocalTokens } from '@/modules/local-tokens'

export interface IOutlineFormProps {
  isLocked?: boolean
  isOpened: boolean
  closeForm: () => void
}

export function OutlineForm ({ isLocked, isOpened, closeForm }: IOutlineFormProps) {
  const { selectedItemIds, currentImportStatus, importToOutline, confirmImport } = useClient()
  const { outlineApiToken: apiToken, setApiTokenFor } = useLocalTokens()
  const isProcessing = currentImportStatus?.status === ITEM_STATUS_IMPORTING
  const isDone = currentImportStatus?.status === ITEM_STATUS_DONE
  const isError = currentImportStatus?.status === ITEM_STATUS_ERROR
  const isConfirmButtonDisabled = !apiToken ||
    isLocked ||
    selectedItemIds.length === 0 ||
    isProcessing ||
    isDone ||
    isError

  useEffect(() => {
    apiToken && importToOutline(apiToken)
  }, [apiToken]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form className='outline-form flex flex-col max-h-full gap-2'>
      <h3>Confirm Outline Import</h3>
      <div className='form-field'>
        <label className='form-label'>Outline API Token</label>
        <div className='form-control relative w-full'>
          <input
            name='apiToken'
            placeholder='Type here'
            type='password'
            className='input max-w-full focus:ring-1 ring-indigo-500'
            value={apiToken}
            onChange={ev => setApiTokenFor('outline', ev.target.value)}
            disabled={isLocked || isDone}
          />
        </div>
      </div>
      <div className='text-xs outline-form__description'>
        <p className='leading-snug'>
          You are importing <span className='text-indigo-500 font-semibold'>{selectedItemIds.length}</span> items into Outline
        </p>
        <p className='leading-snug'>
          Please note that Outline importer tends to mirror the same structure with imported Coda pages
          <b
            className='ml-1 rounded-md bg-slate-200 hover:bg-slate-300 inline-block cursor-help leading-[10px] px-0.5'
            title='So imported pages will still be nested under the same parent page if any, and the same doc (or Outline collection).'
          >···
          </b>
        </p>
        <p className='leading-snug mb-0'>
          Also, newly created collection created on Outline will be <span className='font-semibold'>private</span> by default.
        </p>
      </div>
      <OutlineFormStatus isMissingApiToken={!apiToken} />
      <OutlineFormIssues />
      <OutlineFormLogs />
      <div className='form-field'>
        <div className='form-control justify-between'>
          <button
            type='button'
            className={classNames(
              'btn bg-gray-800 hover:bg-gray-700 text-zinc-50 w-full cursor-pointer!',
              isProcessing && 'btn-loading',
              isDone && 'hidden',
            )}
            onClick={confirmImport}
            disabled={isConfirmButtonDisabled}
          >
            {isProcessing ? 'Working on it' : 'Go ahead'}
          </button>
        </div>
        <div className='form-control justify-between mt-2'>
          <button
            type='button'
            className={classNames(
              'btn w-full cursor-pointer! disabled',
              isLocked ? 'text-zinc-300' : 'hover:bg-gray-200',
            )}
            onClick={closeForm}
          >
            {isDone ? 'Close' : 'Hmm.. not sure'}
          </button>
        </div>
      </div>
    </form>
  )
}
