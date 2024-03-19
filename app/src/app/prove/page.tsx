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
import { useCallback, useEffect, useState } from "react";
import Loading from "../loading";
import { publicClient } from "@/lib/viemClient";
import { Config, useReadContract } from "wagmi";

const MAX_INPUTS = 52;
export default async function Prove() {
  const smartAccountAddress = useSmartAccount();
  const [inputs, setInputs] = useState<UserInput<typeof jsonInputs> | null>();

  const { data: lastProvenBlock } = useReadContract<
    typeof AxiomPaymasterAbi,
    "lastProvenBlock",
    [string, string],
    Config,
    bigint
  >({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.PAYMASTER_ADDRESS as `0x${string}`,
    abi: AxiomPaymasterAbi,
    functionName: "lastProvenBlock",
    args: [smartAccountAddress, Constants.PROTOCOL_ADDRESS],
    query: {
      enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress)
    }
  });

  const { data: logs, isPending } = useLogs(Constants.CHAIN_ID_SEPOLIA, {
    address: Constants.PROTOCOL_ADDRESS,
    event: parseAbiItem('event StoreInput(address indexed caller, uint256 value)') as any,
    args: {
      caller: smartAccountAddress as `0x${string}`,
    } as any,
    // Block at which the contract was deployed
    fromBlock: lastProvenBlock === BigInt(0) ? BigInt(5483024) : lastProvenBlock,
    toBlock: 'latest'
  }, {
    enabled: smartAccountAddress !== undefined && isAddress(smartAccountAddress) && lastProvenBlock !== undefined
  })

  const fetchValidInputs = useCallback(async (): Promise<void> => {
    if (inputs) {
      return;
    }

    if (!logs) {
      setInputs(null);
      return;
    };

    const validLogSequence = [];
    const validBlockSequence = [];
    const validTxIdxSequence = [];
    const validLogIdxSequence = [];

    /** 
     * @todo This is prone to errors.
     * E.g. If last tx was today but user had previous streak that ended 10 days ago, it will not be caught by this logic
     */
    for (let i = logs.length - 1; i >= 0; i--) {
      if (!lastProvenBlock || lastProvenBlock >= logs[i].blockNumber!) {
        continue;
      }

      if (validLogSequence.length === 0) {
        validLogSequence.push(logs[i]);
        continue;
      }
      const lastIdx = validLogSequence.length - 1;
      if (
        validLogSequence[lastIdx].blockNumber !== null &&
        logs[i].blockNumber !== null &&
        Number(validLogSequence[lastIdx].blockNumber) - Number(logs[i].blockNumber) < Constants.ONE_WEEK_IN_BLOCKS
      ) {
        /** 
         * @todo This can be further optimized. 
         * It shoud look for the greatest block number window, no greater than one week in blocks 
         * Currently, this takes all transactions even if they are not required 
         */
        validLogSequence.push(logs[i]);
      }
    }

    if (validLogSequence.length < 2) {
      setInputs(null);
      return;
    }

    for (const validLog of validLogSequence) {
      const receipt = await publicClient.getTransactionReceipt({
        hash: validLog.transactionHash!
      });

      for (const [idx, log] of Array.from(receipt.logs.entries())) {
        if (
          log.topics[0] === Constants.STORE_INPUT_EVENT_SCHEMA &&
          log.topics[1]?.toLowerCase() === bytes32(smartAccountAddress!.toLowerCase())
        ) {
          validBlockSequence.push(Number(validLog.blockNumber));
          validTxIdxSequence.push(Number(validLog.transactionIndex));
          validLogIdxSequence.push(Number(idx.toString()));
        }
      }
    }

    const ascBlocks = validBlockSequence.reverse();
    const ascTxIdxs = validTxIdxSequence.reverse();
    const ascLogIdxs = validLogIdxSequence.reverse();

    setInputs({
      blockNumbers: padArray(ascBlocks, MAX_INPUTS, ascBlocks[ascBlocks.length - 1]),
      txIdxs: padArray(ascTxIdxs, MAX_INPUTS, ascTxIdxs[ascTxIdxs.length - 1]),
      logIdxs: padArray(ascLogIdxs, MAX_INPUTS, ascLogIdxs[ascLogIdxs.length - 1]),
      addr: smartAccountAddress!,
      contractAddress: Constants.PROTOCOL_ADDRESS
    })
  }, [logs])

  useEffect(() => {
    fetchValidInputs();
  }, [fetchValidInputs]);

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
        !inputs ?
          <div>
            <p>Nothing to prove. Please <Link href={Routes.home}> interact with the protocol</Link> first </p>
            {lastProvenBlock !== undefined &&
              <p>Last proven block: {Number(lastProvenBlock)}</p>
            }
          </div> :
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
