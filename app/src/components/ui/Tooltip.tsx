import Tippy from '@tippyjs/react'
import React from 'react'

type TooltipProps = {
  children?: React.ReactElement<any>;
  text?: React.ReactNode;
}

const Tooltip = ({ children, text }: TooltipProps) => {
  return (
    <Tippy
      content={<div className='text-sm text-inherit font-normal p-2'>{text}</div>}
      interactive
      allowHTML={true}
      maxWidth={384}
      className='rounded-md shadow-lg bg-light max-w-sm'>
      {children}
    </Tippy>
  )
}

export default Tooltip