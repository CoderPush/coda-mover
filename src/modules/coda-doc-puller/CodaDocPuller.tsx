'use client'

import { CodaDocList } from './CodaDocList'
import { useEffect, useState } from 'react'
import type { ICodaItems } from './interfaces'
import { MoverClient, type IItemStatuses } from '../mover'

export function CodaDocPuller () {
  const [apiToken, setApiToken] = useState('')
  const [items, setItems] = useState<ICodaItems>([])
  const [itemStatuses, setItemStatuses] = useState<IItemStatuses>({})
  const [mover, setMover] = useState<MoverClient | null>(null)
  const isPullButtonDisabled = !apiToken
  const message = !apiToken && 'Please provide Coda API token'

  useEffect(() => {
    if (mover) return

    // Ensure mover server started
    // TODO: handle errors
    void fetch('/api/mover')

    const client = new MoverClient()

    client.handleServerReturnDocs(docs => setItems(docs))
    client.handleItemStatus(itemStatus => setItemStatuses({
      ...itemStatuses,
      [itemStatus.id]: itemStatus,
    }))

    setMover(client)
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
