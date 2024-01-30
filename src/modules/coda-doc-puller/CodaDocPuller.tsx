'use client'

import { CodaDocList } from './CodaDocList'
import { useEffect, useState } from 'react'
import { MoverClient, CLIENT_SYNC_DOCS, type IItemStatuses, type ICodaItems } from '../mover/client'

export function CodaDocPuller () {
  const [apiToken, setApiToken] = useState('')
  const [items, setItems] = useState<ICodaItems>([])
  const [itemStatuses, setItemStatuses] = useState<IItemStatuses>({})
  const [isConnected, setIsConnected] = useState(false)
  const [mover, setMover] = useState<MoverClient | null>(null)
  const isSyncingDocs = itemStatuses[CLIENT_SYNC_DOCS] && itemStatuses[CLIENT_SYNC_DOCS].status !== 'done'
  const isPullButtonDisabled = !apiToken || !isConnected || isSyncingDocs
  let message = ''

  if (!apiToken) {
    message = 'Please provide Coda API token'
  } else if (!isConnected) {
    message = 'Please wait for connection'
  }

  useEffect(() => {
    if (mover) return

    // Ensure mover server started
    fetch('/api/mover').then(() => {
      const client = new MoverClient()

      client.handleServerResponses({
        onConnection: state => setIsConnected(state === 'opened'),
        onItems: items => setItems(items),
        onStatuses: itemStatuses => setItemStatuses(itemStatuses),
      })

      setMover(client)
    }).catch(err => {
      // TODO: show error to UI
      console.error(err)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='coda-doc-puller'>
      <form className='flex items-end gap-3'>
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
              onClick={() => apiToken && mover?.syncDocs(apiToken)}
            >Pull
            </button>
          </div>
        </div>
      </form>
      {message && (
        <div className='mt-3 text-indigo-600'>ℹ <span className='text-sm'>{message}</span></div>
      )}
      <CodaDocList items={items} className='mt-3' statuses={itemStatuses} />
    </div>
  )
}
