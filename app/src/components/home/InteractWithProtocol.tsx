
import React, { useEffect, useMemo, useState } from 'react'
import Button from '../ui/Button';
import Link from 'next/link';
import { Constants } from '@/shared/constants';
import { useAccount, useSimulateContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import SimpleProtocolAbi from '@/lib/abi/SimpleProtocol.json';
import SimpleAccountAbi from '@/lib/abi/SimpleAccount.json';
import { useQueryClient } from '@tanstack/react-query';
import { encodeFunctionData } from 'viem';
import { useSmartAccount } from '@/lib/hooks/useSmartAccount';

const InteractWithProtocol = () => {
  const { address } = useAccount();
  const [valueToStore, setValueToStore] = useState(0);
  const smartAccountAddress = useSmartAccount();

  const updateValueToStore = () => {
    setValueToStore(Math.round(Math.random() * 10 ** 12));
  }

  useEffect(() => {
    updateValueToStore()
  }, [])

  const args = useMemo(() => [Constants.PROTOCOL_ADDRESS, BigInt(0), encodeFunctionData({
    abi: SimpleProtocolAbi,
    functionName: 'store',
    args: [valueToStore]
  })], [valueToStore]);

  const { data, error } = useSimulateContract({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: smartAccountAddress as `0x${string}`,
    abi: SimpleAccountAbi,
    functionName: 'execute',
    args: args,
    query: {
      enabled: address !== undefined && args !== undefined
    }
  });

  const { data: txHash, writeContract, isSuccess, isPending, reset } = useWriteContract();
  const queryClient = useQueryClient();

  useWatchContractEvent({
    address: Constants.PROTOCOL_ADDRESS as `0x${string}`,
    abi: SimpleProtocolAbi,
    eventName: 'StoreInput',
    onLogs: () => {
      updateValueToStore();
      // reset useLogs query
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      reset();
    },
  });

  const renderButtonText = () => {
    if (isSuccess) {
      return "Waiting tx...";
    }
    if (isPending) {
      return "Confirm transaction in wallet...";
    }
    return "Interact with protocol";
  }

  const renderExplorerLink = () => {
    if (!txHash) return null;
    return (
      <Link href={`${Constants.ETHERSCAN_BASE_URL}tx/${txHash}`} target="_blank">
        View last tx
      </Link>
    )
  }

  if (error) {
    console.error(error);
  }
  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        disabled={!Boolean(data?.request) || isPending}
        onClick={() => writeContract(data!.request)}
      >
        {renderButtonText()}
      </Button>
      {error &&
        <p className='text-red-500'>{String(error.cause)}</p>
      }
      <div className="flex flex-col items-center text-sm gap-2">
        {renderExplorerLink()}
      </div>
    </div >
  )
}

export default InteractWithProtocol