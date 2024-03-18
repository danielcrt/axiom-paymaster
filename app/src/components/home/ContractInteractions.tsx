import { useSmartAccount } from '@/lib/hooks/useSmartAccount'
import { Constants } from '@/shared/constants';
import React, { } from 'react'
import { isAddress, parseAbiItem } from 'viem';
import InteractionEntry from './InteractionEntry';
import { useLogs } from '@/lib/hooks/useLogs';

const ContractInteractions = () => {
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

  return (
    <>
      <div>Protocol usage</div>
      <div className="relative overflow-x-auto">
        <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th scope="col" className="px-6 py-3">
                Tx
              </th>
              <th scope="col" className="px-6 py-3">
                Block
              </th>
              <th scope="col" className="px-6 py-3">
                Age
              </th>
            </tr>
          </thead>
          <tbody>
            {logs?.map(log => <InteractionEntry log={log} />)}
          </tbody>
        </table>
        {!isPending && logs?.length === 0 &&
          <p className='text-center'>
            No protocol usage.
          </p>
        }
      </div>
    </>
  )
}

export default ContractInteractions