
import React, { useEffect, useState } from 'react'
import Button from '../ui/Button';
import Link from 'next/link';
import { Constants, DEFAULT_USER_OP } from '@/shared/constants';
import { Config, useAccount, useReadContract, useSignMessage, useSimulateContract, useWatchContractEvent, useWriteContract } from 'wagmi';
import SimpleProtocolAbi from '@/lib/abi/SimpleProtocol.json';
import SimpleAccountAbi from '@/lib/abi/SimpleAccount.json';
import EntryPointAbi from '@/lib/abi/EntryPoint.json';
import { useQueryClient } from '@tanstack/react-query';
import { ZeroAddress, isAddress } from 'ethers';
import { encodeFunctionData } from 'viem';
import { useSmartAccount } from '@/lib/hooks/useSmartAccount';
import { getUserOpHash, packUserOp } from '@/lib/utils';
import { PackedUserOperation } from '@/shared/types';

const InteractWithProtocol = () => {
  const { address } = useAccount();
  const [valueToStore, setValueToStore] = useState(0);
  const smartAccountAddress = useSmartAccount();
  const { signMessageAsync, isPending: isPendingSignature } = useSignMessage();
  const [args, setArgs] = useState<(PackedUserOperation[] | string)[]>();

  const { data: accountNonce } = useReadContract<
    typeof SimpleAccountAbi,
    "getNonce",
    [],
    Config,
    bigint
  >({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: smartAccountAddress as `0x${string}`,
    abi: SimpleAccountAbi,
    functionName: "getNonce",
    args: [],
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress),
    },
  })
  const updateValueToStore = () => {
    setValueToStore(Math.round(Math.random() * 10 ** 12));
  }

  useEffect(() => {
    updateValueToStore()
  }, [])

  const { data, error } = useSimulateContract({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.ENTRY_POINT_ADDRESS as `0x${string}`,
    abi: EntryPointAbi,
    functionName: 'handleOps',
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
    onLogs: (logs) => {
      setArgs(undefined);
      updateValueToStore();
      // reset useLogs query
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      reset();
    },
  });

  const renderButtonText = () => {
    if (isPending || isPendingSignature) {
      return "Confirm transaction in wallet...";
    }
    return "Interact with protocol";
  }

  const renderRelayTxButtonText = () => {
    if (isSuccess) {
      return "Waiting tx...";
    }
    if (isPending) {
      return "Confirm transaction in wallet...";
    }
    return "Relay tx";
  }

  const renderExplorerLink = () => {
    if (!txHash) return null;
    return (
      <Link href={`${Constants.ETHERSCAN_BASE_URL}tx/${txHash}`} target="_blank">
        View last tx
      </Link>
    )
  }

  const handleSubmit = async () => {
    const userOp = { ...DEFAULT_USER_OP };

    const storeCallData = encodeFunctionData({
      abi: SimpleProtocolAbi,
      functionName: 'store',
      args: [valueToStore]
    });

    const callData = encodeFunctionData({
      abi: SimpleAccountAbi,
      functionName: 'execute',
      args: [Constants.PROTOCOL_ADDRESS, 0, storeCallData]
    });

    userOp.nonce = accountNonce ?? 0;
    userOp.sender = smartAccountAddress ?? ZeroAddress;
    userOp.paymaster = Constants.PAYMASTER_ADDRESS;
    userOp.paymasterVerificationGasLimit = 3e5;
    // @todo fetch value from contract
    userOp.paymasterPostOpGasLimit = 21_000;
    userOp.callData = callData;

    try {
      userOp.signature = await signMessageAsync({
        message: {
          raw: getUserOpHash(userOp, Constants.ENTRY_POINT_ADDRESS, Constants.CHAIN_ID_SEPOLIA) as `0x${string}`
        }
      });
    } catch (e) {
      console.error(e);
      return;
    }

    const packedOps = [packUserOp(userOp)];
    setArgs([packedOps, Constants.BENEFICIARY_ADDRESS]);
  }

  if (error) {
    console.error(error);
  }
  return (
    <div className="flex flex-col items-center gap-2">
      {args ?
        <Button
          disabled={!Boolean(data?.request) || isPending}
          onClick={() => writeContract(data!.request)}
        >
          {renderRelayTxButtonText()}
        </Button> :
        <Button
          disabled={isPendingSignature}
          onClick={() => handleSubmit()}
        >
          {renderButtonText()}
        </Button>
      }
      {error &&
        <p className='text-red-500'>{String(error.cause)}</p>
      }
      <div className="flex flex-col items-center text-sm gap-2">
        {renderExplorerLink()}
      </div>
    </div>
  )
}

export default InteractWithProtocol