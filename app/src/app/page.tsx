"use client";

import Title from '@/components/ui/Title'
import { isContract, shortenAddress } from '@/lib/utils'
import CodeBox from '@/components/ui/CodeBox';
import { useBalance, useBytecode } from 'wagmi';
import { Constants } from '@/shared/constants';
import CreateAccount from '@/components/home/CreateAccount';
import Link from 'next/link';
import { formatEther, isAddress } from 'viem';
import ContractInteractions from '@/components/home/ContractInteractions';
import { useSmartAccount } from '@/lib/hooks/useSmartAccount';
import InteractWithProtocol from '@/components/home/InteractWithProtocol';
import Decimals from '@/components/ui/Decimals';
import Tooltip from '@/components/ui/Tooltip';

export default function Home() {
  const smartAccountAddress = useSmartAccount();

  const { data: bytecode } = useBytecode({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: smartAccountAddress as `0x${string}`,
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress)
    }
  })

  const { data: balance } = useBalance({
    address: smartAccountAddress as `0x${string}`,
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress) && isContract(bytecode)
    }
  })

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
            Balance:&nbsp;<Decimals>
              {formatEther(BigInt(balance?.value ?? 0)).toString()}
            </Decimals>
            {" ETH"}
          </p>
        </div> :
        <div className=''>
          <CreateAccount
            accountAddress={smartAccountAddress ?? ''} />
        </div>
      }
      <ContractInteractions />
      <InteractWithProtocol />
      {/* <AdvanceStepButton
        label="Generate Proof"
        href={"/prove?" + forwardSearchParams({ connected: address })}
      /> */}
    </>
  )
}