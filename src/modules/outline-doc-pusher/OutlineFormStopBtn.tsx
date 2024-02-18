export interface IOutlineFormStopBtnProps {
  onStop: () => void
}

export function OutlineFormStopBtn ({ onStop }: IOutlineFormStopBtnProps) {
  return (
    <>
      <label className='btn btn-block hover:bg-gray-200' htmlFor='outline-form-cancel'>Stop</label>
      <input className='modal-state' id='outline-form-cancel' type='checkbox' />
      <div className='modal'>
        <label className='modal-overlay' htmlFor='outline-form-cancel' />
        <div className='modal-content flex flex-col'>
          <h4 className='text-xl'>Stop Imports</h4>
          <p>
            Are you sure you want to stop the ongoing import process?
          </p>
          <div className='flex gap-3 mt-3'>
            <button type='button' className='btn btn-error btn-block hover:bg-red-600' onClick={onStop}>Yes, stop it</button>
            <label htmlFor='outline-form-cancel' className='btn btn-block hover:bg-gray-200'>No</label>
          </div>
        </div>
      </div>
    </>
  )
}
