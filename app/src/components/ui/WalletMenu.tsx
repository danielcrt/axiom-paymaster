import Tippy from '@tippyjs/react';
import Link from 'next/link';
import React, { useState } from 'react'
import { useAccount, useDisconnect, useSwitchChain } from 'wagmi';
import Button from './Button';
import { shortenAddress } from '@/lib/utils';
import ConnectWallet from '../web3/ConnectWallet';
import { Constants } from '@/shared/constants';
import SwitchChainButton from '../web3/SwitchChainButton';

const WalletMenu = () => {
  const [visible, setVisible] = useState(false);
  const toggle = () => setVisible(!visible);
  const hide = () => setVisible(false);
  const { address, isConnected, chainId, isConnecting, chain } = useAccount();
  const { disconnect } = useDisconnect()
  const { switchChain } = useSwitchChain();

  if (isConnecting) return null;

  if (!isConnected || !address) {
    return <ConnectWallet />
  }

  if (chainId !== Constants.CHAIN_ID_SEPOLIA) {
    return <SwitchChainButton switchChain={switchChain} />
  }

  const renderPopoverContent = () => {
    return (
      <div className='rounded-lg shadow-2xl bg-white p-3 flex flex-col'>
        <div className='flex gap-2 items-center font-medium cursor-pointer hover:opacity-80'>
          <p>{shortenAddress(address)}</p>
        </div>
        <hr className='m-2' />
        <Link
          href='#'
          onClick={(e) => {
            e.preventDefault();
            disconnect();
            hide();
          }}
          className='flex items-center p-2 gap-1 no-underline hover:no-underline text-inherit'>
          Disconnect
        </Link>
      </div>
    )
  }

  return (
    <Tippy
      content={renderPopoverContent()}
      visible={visible}
      className={'m-auto'}
      onClickOutside={hide}
      interactive
      placement='bottom-start'
      offset={[0, 4]}
      allowHTML={true}>
      <span className='text-primary-500 cursor-pointer rounded-full flex items-center' onClick={() => {
        toggle();
      }}>
        {shortenAddress(address)}
      </span>
    </Tippy>
  )

}

export default WalletMenu