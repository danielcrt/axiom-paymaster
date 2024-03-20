import React from 'react'
import Button from '../ui/Button'
import { useAccount, useBytecode, useSimulateContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import AccountFactoryAbi from '@/lib/abi/AccountFactory.json';
import SimpleAccountAbi from '@/lib/abi/SimpleAccount.json';
import { Constants } from '@/shared/constants';
import Link from 'next/link';
import { isAddress } from 'ethers';

type CreateAccountProps = {
  accountAddress: string;
}
const CreateAccount = ({ accountAddress }: CreateAccountProps) => {
  const { address } = useAccount();

  const { data } = useSimulateContract({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactoryAbi,
    functionName: 'createAccount',
    args: [address, Constants.SMART_ACCOUNT_SALT],
    query: {
      enabled: address !== undefined
    }
  });
  const { data: txHash, writeContract, isSuccess, isPending, reset } = useWriteContract();

  const { refetch } = useBytecode({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: accountAddress as `0x${string}`,
    query: {
      enabled: accountAddress !== undefined && isAddress(accountAddress)
    }
  })

  useWatchContractEvent({
    address: accountAddress as `0x${string}`,
    abi: SimpleAccountAbi,
    eventName: 'SimpleAccountInitialized',
    onLogs: () => {
      // Refetching will update the page state and hide this component
      refetch();
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
    return "Create account";
  }

  const renderExplorerLink = () => {
    if (!txHash) {
      return null;
    }
    return (
      <Link href={`${Constants.ETHERSCAN_BASE_URL}tx/${txHash}`} target="_blank">
        View tx
      </Link>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        disabled={!Boolean(data?.request) || isPending}
        onClick={() => writeContract(data!.request)}
      >
        {renderButtonText()}
      </Button>
      <div className="flex flex-col items-center text-sm gap-2">
        {renderExplorerLink()}
      </div>
    </div>
  )
}

export default CreateAccount