'use client'

// import { CodaDocList } from './CodaDocList'
import { CodaDocPullerForm } from './CodaDocPullerForm'
import { CodaDocTable } from './CodaDocTable'
import { CodaTopFilters } from './CodaTopFilters'

export function CodaDocPuller () {
  return (
    <div className='coda-doc-puller flex flex-col overflow-hidden px-4 pb-2'>
      <CodaDocPullerForm />
      {/* <CodaDocList className='mt-3' /> */}
      <CodaTopFilters className='mt-3' />
      <CodaDocTable className='mt-2' />
    </div>
  )
}
