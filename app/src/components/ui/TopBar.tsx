"use client"
import Link from 'next/link'
import React from 'react'
import dynamic from 'next/dynamic'
import { Routes } from '@/shared/routes';

const WalletMenu = dynamic(() => import('./WalletMenu'), {
  ssr: false,
});

const TopBar = () => {
  return (
    <div className='max-w-xl mx-auto h-16 flex flex-row items-center gap-2 justify-between'>
      <div className='flex items-center justify-center gap-2'>
        <Link href={'/'}>
          Home
        </Link>
        <Link href={Routes.prove}>
          Prove
        </Link>
      </div>
      <div className='flex items-center gap-2'>
        <WalletMenu />
      </div>
    </div>
  )
}

export default TopBar