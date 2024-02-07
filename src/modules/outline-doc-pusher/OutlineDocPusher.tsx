'use client'

import { useState } from 'react'
import { ITEM_STATUS_IMPORTING, ITEM_STATUS_VALIDATING, useClient } from '../simple-mover/client'
import { OutlineForm } from './OutlineForm'

export function OutlineDocPusher () {
  const { selectedItemIds, currentImportStatus } = useClient()
  const isBottomBoxShown = selectedItemIds.length > 0
  const isSideFormLocked = currentImportStatus?.status === ITEM_STATUS_VALIDATING ||
    currentImportStatus?.status === ITEM_STATUS_IMPORTING
  const [isSideFormOpened, setIsSideFormOpened] = useState(false)

  const closeSideForm = () => {
    if (isSideFormLocked) return
    setIsSideFormOpened(false)
    // cancelImport()
  }

  return (
    <div className='outline-doc-pusher mt-auto'>
      {isBottomBoxShown && (
        <div className='flex items-center gap-1 p-4 shadow-[0_3px_10px_rgb(0,0,0,0.2)]'>
          <h5 className='grow m-0'>
            <span className='text-indigo-500 mr-1 font-medium'>{selectedItemIds.length}</span>
            items selected
          </h5>

          <label
            htmlFor='drawer-right'
            className='btn btn-primary font-bold cursor-pointer! bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl'
          >
            Push to Outline
          </label>
        </div>
      )}
      <input
        type='checkbox'
        id='drawer-right'
        className='drawer-toggle'
        checked={isSideFormOpened}
        onChange={ev => setIsSideFormOpened(ev.target.checked)}
      />
      <div className='overlay' onClick={closeSideForm} />
      <div className='drawer drawer-right'>
        <div className='drawer-content flex flex-col h-full'>
          <OutlineForm isLocked={isSideFormLocked} isOpened={isSideFormOpened} closeForm={closeSideForm} />
        </div>
      </div>
    </div>
  )
}
