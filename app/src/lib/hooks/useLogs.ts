import { Constants } from "@/shared/constants";
import { publicClient } from "../viemClient";
import { GetLogsParameters } from "viem";
import { QueryKey, UseQueryOptions, useQuery } from "@tanstack/react-query";
import { getLogs } from "viem/actions";

type Logs = Awaited<ReturnType<typeof getLogs>>;

export const useLogs = <TData extends Logs | undefined>(
  chainId: number = Constants.CHAIN_ID_SEPOLIA,
  parameters: GetLogsParameters,
  options?: Omit<UseQueryOptions<unknown, Error, TData>, "queryKey">
) => {
  const key = [
    "logs",
    chainId,
    parameters.address,
    Number(parameters.fromBlock),
    Number(parameters.toBlock),
    JSON.stringify(
      parameters.args,
      (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
    ),
  ];

  return useQuery<unknown, Error, TData>({
    ...options,
    refetchOnWindowFocus: false,
    queryKey: key as QueryKey,
    queryFn: async () => {
      return await publicClient.getLogs(parameters);
    },
  });
};
