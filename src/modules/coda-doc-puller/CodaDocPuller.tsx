'use client'

import { CodaDocList } from './CodaDocList'
import { MoverClientProvider } from '../mover/client'
import { CodaDocPullerForm } from './CodaDocPullerForm'

export function CodaDocPuller () {
  return (
    <MoverClientProvider>
      <div className='coda-doc-puller flex flex-col overflow-hidden'>
        <CodaDocPullerForm />
        <CodaDocList className='mt-3' />
      </div>
    </MoverClientProvider>
  )
}
