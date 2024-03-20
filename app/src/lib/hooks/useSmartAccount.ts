import { Config, useAccount, useReadContract } from "wagmi";

import AccountFactoryAbi from '@/lib/abi/AccountFactory.json';
import { Constants } from "@/shared/constants";

export const useSmartAccount = () => {
  const { address } = useAccount();
  const { data: smartAccountAddress } = useReadContract<
    typeof AccountFactoryAbi,
    "getAddress",
    [string, bigint],
    Config,
    string
  >({
    chainId: Constants.CHAIN_ID_SEPOLIA,
    address: Constants.ACCOUNT_FACTORY_ADDRESS,
    abi: AccountFactoryAbi,
    functionName: "getAddress",
    args: [address, Constants.SMART_ACCOUNT_SALT],
    query: {
      enabled: address !== undefined,
    },
  });

  return smartAccountAddress;
};
