'use client'

import { useState } from 'react'
import { useClient } from '../mover/client'

export function OutlineForm () {
  const { selectedItemIds } = useClient()
  const [apiToken, setApiToken] = useState('')
  const isConfirmButtonDisabled = !apiToken

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
            onChange={ev => setApiToken(ev.target.value)}
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
      <div className='text-sm outline-form__status'>
        <p className='leading-snug flex gap-2 text-sm text-error'>
          <span className='badge badge-error w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Please provide API token
        </p>
        <p className='leading-snug flex gap-2 text-sm text-error'>
          <span className='badge badge-error w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Request 401 error
        </p>
        <p className='leading-snug flex gap-2 text-sm text-success'>
          <span className='badge badge-success w-4 h-4 text-[0.5rem] p-1 mt-0.5'>✓</span>
          All good!
        </p>
        <p className='leading-snug text-indigo-500 flex gap-2 text-sm  items-center'>
          <svg aria-hidden='true' role='status' className='inline w-4 h-4 text-gray-200 animate-spin dark:text-gray-600' viewBox='0 0 100 101' fill='none' xmlns='http://www.w3.org/2000/svg'>
            <path d='M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z' fill='currentColor' />
            <path d='M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z' fill='#1C64F2' />
          </svg>
          Server is checking for potential issues...
        </p>
        <p className='leading-snug flex gap-2 text-sm items-center mb-0'>
          Please carefully review following issues and click confirm to proceed:
        </p>
      </div>
      <div className='outline-form__issues pl-2 overflow-y-auto hidden'>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='badge text-zinc-50 bg-slate-900 w-4 h-4 text-[0.5rem] p-1.5 mt-0.5'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
      </div>
      <div className='outline-form__issues pl-2 overflow-y-auto'>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='text-indigo-500 w-4 h-4 text-center mr-1'>»</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='text-success w-4 h-4 text-center mr-1'>✓</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
        <p className='leading-snug flex gap-1 text-xs'>
          <span className='text-error w-4 h-4 text-center mr-1'>!</span>
          Collection Open-source product playbook [useful reading] exists
        </p>
      </div>
      <div className='form-field'>
        <div className='form-control justify-between'>
          <button
            type='button'
            className='btn bg-gray-800 hover:bg-gray-700 text-zinc-50 w-full cursor-pointer!'
            disabled={isConfirmButtonDisabled}
          >Go ahead
          </button>
        </div>
        <div className='form-control justify-between mt-2'>
          <label
            htmlFor='drawer-right'
            className='btn hover:bg-gray-200 w-full cursor-pointer!'
            onClick={ev => {
              ev.stopPropagation()
              // ev.preventDefault()
            }}
          >Hmm.. not sure
          </label>
        </div>
      </div>
    </form>
  )
}
