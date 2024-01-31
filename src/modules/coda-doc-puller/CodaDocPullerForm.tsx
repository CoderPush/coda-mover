import { useState, type HTMLAttributes } from 'react'
import { useClient } from '../mover/MoverClientContext'
import { CLIENT_SYNC_DOCS } from '../mover/events'

export interface ICodaDocPullerFormProps extends HTMLAttributes<HTMLFormElement> {
}

export function CodaDocPullerForm ({ className }: ICodaDocPullerFormProps) {
  const [apiToken, setApiToken] = useState('')
  const { isConnected, itemStatuses, isSyncingDocs, syncDocs } = useClient()
  const isDocListingError = itemStatuses?.[CLIENT_SYNC_DOCS]?.status === 'error'
  const isPullButtonDisabled = !apiToken || !isConnected || isSyncingDocs

  let message: string | undefined

  if (!apiToken) {
    message = 'Please provide Coda API token'
  } else if (!isConnected) {
    message = 'Please wait for connection'
  } else if (isDocListingError) {
    message = itemStatuses[CLIENT_SYNC_DOCS].message
  }

  return (
    <form className={`flex items-end flex-wrap gap-3 ${className}`}>
      <div className='form-field'>
        <label className='form-label'>Coda API Token</label>
        <div className='form-control relative w-full'>
          <input
            name='apiToken'
            placeholder='Type here'
            type='password'
            className='input max-w-full'
            value={apiToken}
            onChange={ev => setApiToken(ev.target.value)}
          />
        </div>
      </div>
      <div className='form-field'>
        <div className='form-control justify-between'>
          <button
            type='button'
            className='btn btn-primary w-full hover:bg-indigo-600 cursor-pointer!'
            disabled={isPullButtonDisabled}
            onClick={() => apiToken && syncDocs(apiToken)}
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
