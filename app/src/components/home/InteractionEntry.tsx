import { shortenString } from '@/lib/utils';
import { Constants } from '@/shared/constants';
import Link from 'next/link';
import React from 'react'
import { Log } from 'viem'
import { useBlock } from 'wagmi'
import { formatDistance } from 'date-fns'
import Tooltip from '../ui/Tooltip';

type InteractionEntryProps = {
  log: Log;
}

const InteractionEntry = ({ log }: InteractionEntryProps) => {
  const { data: block } = useBlock({
    blockNumber: log.blockNumber!
  })

  return (
    <tr className="bg-white border-b dark:bg-gray-800 dark:border-gray-700" key={Number(log.blockNumber)}>
      <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">
        <Link href={`${Constants.ETHERSCAN_BASE_URL}tx/${log.transactionHash}`} target='_blank'>
          {shortenString(log.transactionHash ?? '')}
        </Link>
      </th>
      <td className="px-6 py-4">
        {String(log.blockNumber)}
      </td>
      <td className="px-6 py-4">
        {block?.timestamp ? <Tooltip
          text={new Date(Number(block.timestamp) * 1000).toISOString()}>
          <p>
            {formatDistance(new Date(Number(block.timestamp) * 1000), new Date(), {
              addSuffix: true
            })}
          </p>
        </Tooltip> : null}
      </td>
    </tr>
  )
}

export default InteractionEntry