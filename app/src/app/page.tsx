"use client";

import Title from '@/components/ui/Title'
import { isContract, shortenAddress } from '@/lib/utils'
import CodeBox from '@/components/ui/CodeBox';
import { Config, useBytecode, useReadContract } from 'wagmi';
import { Constants } from '@/shared/constants';
import CreateAccount from '@/components/home/CreateAccount';
import Link from 'next/link';
import { formatEther, isAddress } from 'viem';
import ContractInteractions from '@/components/home/ContractInteractions';
import { useSmartAccount } from '@/lib/hooks/useSmartAccount';
import InteractWithProtocol from '@/components/home/InteractWithProtocol';
import Decimals from '@/components/ui/Decimals';
import Tooltip from '@/components/ui/Tooltip';
import InteractViaEntryPoint from '@/components/home/InteractViaEntryPoint';
import EntryPointAbi from '@/lib/abi/EntryPoint.json';
import AxiomPaymasterAbi from '@/lib/abi/AxiomPaymaster.json';
import { UserAllowance } from '@/shared/types';

export default function Home() {
  const smartAccountAddress = useSmartAccount();

  const { data: bytecode } = useBytecode({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: smartAccountAddress as `0x${string}`,
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress)
    }
  })

  const { data: paymasterBalance } = useReadContract<
    typeof EntryPointAbi,
    "balanceOf",
    [string],
    Config,
    bigint
  >({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.ENTRY_POINT_ADDRESS as `0x${string}`,
    abi: EntryPointAbi,
    functionName: "balanceOf",
    args: [Constants.PAYMASTER_ADDRESS],
  });

  const { data: allowance } = useReadContract<
    typeof AxiomPaymasterAbi,
    "getAllowance",
    [string, string],
    Config,
    UserAllowance
  >({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.PAYMASTER_ADDRESS as `0x${string}`,
    abi: AxiomPaymasterAbi,
    functionName: "getAllowance",
    args: [smartAccountAddress, Constants.PROTOCOL_ADDRESS],
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress) && isContract(bytecode)
    }
  });

  let compiledCircuit;
  try {
    compiledCircuit = require("../../axiom/data/compiled.json");
  } catch (e) {
    console.info(e);
  }
  if (compiledCircuit === undefined) {
    return (
      <>
        <div>
          Compile circuit first by running in the root directory of this project:
        </div>
        <CodeBox>
          {"npx axiom compile circuit app/axiom/power-user.circuit.ts"}
        </CodeBox>
      </>
    )
  }

  return (
    <>
      <Title>
        Power User Proof
      </Title>
      {isContract(bytecode) ?
        <div>
          <p>Your Smart account:&nbsp;
            <Tooltip text={smartAccountAddress}>
              <Link href={`${Constants.ETHERSCAN_BASE_URL}address/${smartAccountAddress}`} target="_blank">
                {shortenAddress(smartAccountAddress ?? '')}
              </Link>
            </Tooltip>
          </p>
          <p>
            Paymaster balance:&nbsp;<Decimals decimals={6}>
              {formatEther(BigInt(paymasterBalance ?? 0)).toString()}
            </Decimals>
            {" ETH"}
          </p>
          {allowance?.refundCutoff !== undefined &&
            <>
              {allowance.refundCutoff === 0 ?
                <p>Not eligible for refund</p> :
                <p>
                  Refund cutoff (block number): {allowance.refundCutoff}
                </p>
              }
            </>
          }
          {allowance?.refundValue !== undefined &&
            <p>
              Refund value:&nbsp;<Decimals decimals={6}>
                {formatEther(BigInt(allowance.refundValue ?? 0)).toString()}
              </Decimals>
              {" ETH"}
            </p>
          }
        </div> :
        <div className=''>
          <CreateAccount
            accountAddress={smartAccountAddress ?? ''} />
        </div>
      }
      {isContract(bytecode) &&
        <>
          <ContractInteractions />
          <InteractWithProtocol />
          <InteractViaEntryPoint />
        </>
      }
    </>
  )
}