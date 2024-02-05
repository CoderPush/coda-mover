import { useState, type HTMLAttributes } from 'react'
import { useClient, CLIENT_LIST_DOCS, ITEM_STATUS_ERROR } from '../simple-mover/client'

export interface ICodaDocPullerFormProps extends HTMLAttributes<HTMLFormElement> {
}

export function CodaDocPullerForm ({ className }: ICodaDocPullerFormProps) {
  const [apiToken, setApiToken] = useState('')
  const { isConnected, itemStatuses, isListingDocs, listDocs, selectedItemIds } = useClient()
  const isDocListingError = itemStatuses?.[CLIENT_LIST_DOCS]?.status === ITEM_STATUS_ERROR
  const hasSelectedItems = selectedItemIds.length > 0
  const isFormDisabled = !isConnected || isListingDocs || hasSelectedItems
  const isPullButtonDisabled = !apiToken || isFormDisabled

  let message: string | undefined

  if (!apiToken) {
    message = 'Please provide Coda API token'
  } else if (!isConnected) {
    message = 'Please wait for connection'
  } else if (isDocListingError) {
    message = itemStatuses[CLIENT_LIST_DOCS].message
  }

  return (
    <form
      className={`flex items-end flex-wrap gap-3 ${className}`}
      onSubmit={ev => {
        ev.preventDefault()
        !isFormDisabled && apiToken && listDocs(apiToken)
      }}
    >
      <div className='form-field'>
        <label className='form-label'>Coda API Token</label>
        <div className='form-control relative w-full'>
          <input
            name='apiToken'
            placeholder='Type here'
            type='password'
            className='input max-w-full focus:ring-1 ring-indigo-500'
            value={apiToken}
            onChange={ev => setApiToken(ev.target.value)}
            disabled={isFormDisabled}
          />
        </div>
      </div>
      <div className='form-field'>
        <div className='form-control justify-between'>
          <button
            type='button'
            className='btn btn-primary w-full hover:bg-indigo-600 cursor-pointer!'
            disabled={isPullButtonDisabled}
            onClick={() => apiToken && listDocs(apiToken)}
          >Pull
          </button>
        </div>
      </div>
      {message && (
        <div className='basis-full text-indigo-600'>ℹ <span className='text-sm'>{message}</span></div>
      )}
    </form>
  )
}
