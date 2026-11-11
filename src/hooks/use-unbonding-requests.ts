import { useMemo } from "react";
import useSWR from "swr";
import { readContract } from "@wagmi/core";
import { useWallet } from "./use-wallet";
import { abi } from "@/contract/abi";
import { wagmiAdapter } from "@/config/reown";
import { readContractWithRetry } from "@/utils/contract-calls";
import {
  resolveStakingContractAddress,
  type StakingContractVersion,
} from "@/lib/staking-contract";

export interface UnbondingRequest {
  shares: bigint;
  amount: bigint;
  releaseTime: bigint;
  pool: `0x${string}`;
  isClaimed: boolean;
}

export const useUnbondingRequests = ({
  version = "current",
}: { version?: StakingContractVersion } = {}) => {
  const { address, isConnected } = useWallet();
  const contractAddress = resolveStakingContractAddress(version);

  const { data, error, isLoading, isValidating, mutate } = useSWR<
    UnbondingRequest[]
  >(
    isConnected && address ? ["unbondingRequests", version, contractAddress, address] : null,
    async () => {
      const result = await readContractWithRetry<UnbondingRequest[]>(
        wagmiAdapter.wagmiConfig,
        {
          address: contractAddress,
          abi,
          functionName: "getUnbondingRequests",
          args: [address as `0x${string}`],
        } as unknown as Parameters<typeof readContract>[1],
        "Unbonding requests",
      );
      return result as UnbondingRequest[];
    },
    {
      revalidateOnFocus: false,
    },
  );

  return useMemo(
    () => ({
      unbondingRequests: data ?? [],
      isLoading,
      isValidating,
      error: error?.message || null,
      refetch: mutate,
    }),
    [data, isLoading, isValidating, error, mutate],
  );
};
