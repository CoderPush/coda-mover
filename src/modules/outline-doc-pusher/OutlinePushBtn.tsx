import classNames from 'classnames'
import Image from 'next/image'
import { type LabelHTMLAttributes } from 'react'

import outlineIcon from '@/assets/outline-icon.png'

export interface IOutlinePushBtnProps extends LabelHTMLAttributes<HTMLLabelElement> {
  variant?: 'solid' | 'icon'
}

export function OutlinePushBtn ({ variant = 'solid', className, ...props }: IOutlinePushBtnProps) {
  return (
    <label
      htmlFor='outline-form-open'
      {...props}
      className={classNames(
        'font-bold cursor-pointer rounded',
        variant === 'solid' && 'btn btn-primary bg-gradient-to-br from-green-400 to-blue-600 hover:bg-gradient-to-bl',
        variant === 'icon' && 'block group py-1 w-8 hover:bg-gradient-to-br from-green-400 to-blue-600',
        className,
      )}
      title='Click to import into Outline'
    >
      {variant === 'icon'
        ? (<Image className='group-hover:invert mx-auto' src={outlineIcon} alt='Click to import into Outline' height={25} />)
        : 'Push to Outline'}
    </label>
  )
}
