'use client'

import { useClient } from '../mover/client'

export function OutlineDocPusher () {
  const { selectedItemIds } = useClient()
  const isBottomBoxShown = selectedItemIds.length > 0

  return (
    <div className='outline-doc-pusher mt-auto'>
      {isBottomBoxShown && (
        <div className='flex items-center gap-1 p-4 shadow-[0_3px_10px_rgb(0,0,0,0.2)]'>
          <h5 className='grow m-0'>
            <span className='text-indigo-500 mr-1 font-medium'>{selectedItemIds.length}</span>
            items selected
          </h5>

          <button
            type='button'
            className='btn btn-primary font-bold cursor-pointer! bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl'
          >
            Push to Outline
          </button>
        </div>
      )}
    </div>
  )
}
