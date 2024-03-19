"use client"

import BuildQuery from "@/components/prove/BuildQuery";
import Title from "@/components/ui/Title";
import AxiomPaymasterAbi from '@/lib/abi/AxiomPaymaster.json';
import jsonInputs from "../../../axiom/data/inputs.json";
import { bytes32, padArray } from "@/lib/utils";
import { Constants } from "@/shared/constants";
import { UserInput } from "@axiom-crypto/client";
import { useSmartAccount } from "@/lib/hooks/useSmartAccount";
import { isAddress, parseAbiItem } from "viem";
import { useLogs } from "@/lib/hooks/useLogs";
import { Routes } from "@/shared/routes";
import Link from "next/link";
import { useMemo } from "react";
import Loading from "../loading";

const MAX_INPUTS = 52;
export default async function Prove() {
  const smartAccountAddress = useSmartAccount();

  const { data: logs, isPending } = useLogs(Constants.CHAIN_ID_SEPOLIA, {
    address: Constants.PROTOCOL_ADDRESS,
    event: parseAbiItem('event StoreInput(address indexed caller, uint256 value)') as any,
    args: {
      caller: smartAccountAddress as `0x${string}`,
    } as any,
    // Block at which the contract was deployed
    fromBlock: BigInt(5483024),
    toBlock: 'latest'
  }, {
    enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress)
  })

  const validTxSequence = useMemo((): Partial<UserInput<typeof jsonInputs>> | null => {
    if (!logs) return null;

    const validBlockSequence = [];
    const validTxIdxSequence = [];

    for (let i = logs.length - 1; i >= 0; i--) {
      if (validBlockSequence.length === 0) {
        validBlockSequence.push(Number(logs[i].blockNumber));
        validTxIdxSequence.push(Number(logs[i].transactionIndex));
        continue;
      }
      const lastIdx = validBlockSequence.length - 1;
      if (validBlockSequence[lastIdx] !== null &&
        logs[i].blockNumber !== null &&
        validBlockSequence[lastIdx]! - Number(logs[i].blockNumber) < Constants.ONE_WEEK_IN_BLOCKS
      ) {
        /** 
         * @todo This can be further optimized. 
         * It shoud look for the greatest block number window, no greater than one week in blocks 
         * Currently, this takes all transactions even if they are not required 
         */
        validBlockSequence.push(Number(logs[i].blockNumber));
        validTxIdxSequence.push(Number(logs[i].transactionIndex));
      }
    }

    if (validBlockSequence.length < 2) {
      return null;
    }

    const ascBlocks = validBlockSequence.reverse();
    const ascTxIdxs = validTxIdxSequence.reverse();

    return {
      blockNumbers: padArray(ascBlocks, MAX_INPUTS, ascBlocks[ascBlocks.length - 1]),
      txIdxs: padArray(ascTxIdxs, MAX_INPUTS, ascTxIdxs[ascTxIdxs.length - 1]),
    }
  }, [logs])

  const inputs: UserInput<typeof jsonInputs> = {
    blockNumbers: validTxSequence?.blockNumbers ?? [],
    txIdxs: validTxSequence?.txIdxs ?? [],
    logIdxs: Array(MAX_INPUTS).fill(0),
    addr: smartAccountAddress!,
    contractAddress: Constants.PROTOCOL_ADDRESS
  }

  return (
    <>
      <Title>
        Prove
      </Title>
      <div className="text-center">
        Please wait while your browser generates a compute proof for the Axiom Query.
      </div>
      {isPending ?
        <Loading /> :
        validTxSequence === null ?
          <p>Nothing to prove. Please <Link href={Routes.home}> interact with the protocol</Link> first </p> :
          <div className="flex flex-col gap-2 items-center">
            <p>You are eligible for refunds for {inputs.blockNumbers[inputs.blockNumbers.length - 1] - inputs.blockNumbers[0]} blocks</p>
            <BuildQuery
              inputs={inputs}
              callbackTarget={Constants.PAYMASTER_ADDRESS}
              callbackExtraData={bytes32("")}
              refundee={smartAccountAddress!}
              callbackAbi={AxiomPaymasterAbi}
            />
          </div>
      }
    </>
  )
}
