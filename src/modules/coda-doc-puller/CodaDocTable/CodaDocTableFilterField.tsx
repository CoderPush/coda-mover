import classNames from 'classnames'

export interface ICodaDocTableFilterFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  name: string
}

export function CodaDocTableFilterField ({ name, className, ...props }: ICodaDocTableFilterFieldProps) {
  return (
    <div {...props} className={classNames('flex items-center rounded relative border-none', className)}>
      <input
        className='input input-xs rounded-lg border-none max-w-none bg-slate-50 focus:bg-slate-100'
        placeholder={`Filter ${name}`}
      />
      <label
        className='h-4 leading-4 mx-1 px-1 absolute right-0
          text-xs rounded-lg border-none cursor-pointer
          bg-slate-100 hover:bg-slate-200 text-zinc-400 hover:text-zinc-600'
        title='Clear filter'
      >
        ✕
      </label>
    </div>
  )
}
