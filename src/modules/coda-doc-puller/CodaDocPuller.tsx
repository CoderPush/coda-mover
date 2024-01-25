'use client'

import { useFormState, useFormStatus } from 'react-dom'
import listDocs from './actions/listDocs'
import { CodaDocList } from './CodaDocList'

export function CodaDocPuller () {
  const [listState, listAction] = useFormState(listDocs, {})
  const { pending } = useFormStatus()
  // TODO: refine pull button disabling condition
  // For now disable even when api token provided to prevent spamming background doc listing tasks
  const isPullButtonDisabled = Boolean(pending || listState.apiToken)

  return (
    <div className='coda-doc-puller'>
      <form action={listAction} className='flex items-end gap-3'>
        <div className='form-field'>
          <label className='form-label'>Coda API Token</label>
          <div className='form-control relative w-full'>
            <input
              name='apiToken'
              placeholder='Type here'
              type='password'
              className='input max-w-full'
              defaultValue={listState.apiToken}
            />
          </div>
        </div>
        <div className='form-field'>
          <div className='form-control justify-between'>
            <button
              className='btn btn-primary w-full hover:bg-indigo-600 cursor-pointer!'
              disabled={isPullButtonDisabled}
            >Pull
            </button>
          </div>
        </div>
      </form>
      {listState.message && (
        <div className='mt-3 text-indigo-600'>ℹ <span className='text-sm'>{listState.message}</span></div>
      )}
      {listState.apiToken && (
        <CodaDocList items={listState.docs || []} className='mt-3' />
      )}
    </div>
  )
}
