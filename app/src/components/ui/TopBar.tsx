"use client"
import Link from 'next/link'
import React from 'react'
import dynamic from 'next/dynamic'

const WalletMenu = dynamic(() => import('./WalletMenu'), {
  ssr: false,
});

const TopBar = () => {
  return (
    <div className='max-w-xl mx-auto h-16 flex flex-row items-center gap-2 justify-between'>
      <div className='flex items-center justify-center'>
        <Link href={'/'}>
          Home
        </Link>
      </div>
      <div className='flex items-center gap-2'>
        <WalletMenu />
      </div>
    </div>
  )
}

export default TopBar