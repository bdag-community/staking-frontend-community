import { useMemo } from "react";
import useSWR from "swr";
import { readContract } from "@wagmi/core";
import { abi } from "@/contract/abi";
import { ENV } from "@/config/env";
import { wagmiAdapter } from "@/config/reown";
import { readContractWithRetry } from "@/utils/contract-calls";
import { useWallet } from "./use-wallet";
import { resolveStakingContractAddress, stakingTimingSelectors, type StakingContractVersion } from '@/lib/staking-contract';

export const useInitialBondingPeriod = ({version='current'}: {version?: StakingContractVersion} = {}) => {
  const { address, isConnected } = useWallet();
  const contract = resolveStakingContractAddress(version);
  const selectors = stakingTimingSelectors({chainId:Number(ENV.CHAIN.ID), version, legacyOnly:ENV.LEGACY_ONLY});

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    isConnected && address ? ["initialBondingPeriod", ENV.CHAIN.RPC_URL, contract, address] : null,
    async () => {
      const [firstDepositTimestamp, bondingPeriod, frozenEnd] = await Promise.all([
        readContractWithRetry<bigint>(
          wagmiAdapter.wagmiConfig,
          {
            address: contract,
            abi,
            functionName: "userFirstDepositTimestamp",
            args: [address as `0x${string}`],
          } as unknown as Parameters<typeof readContract>[1],
          "First deposit timestamp",
        ),
        readContractWithRetry<bigint>(
          wagmiAdapter.wagmiConfig,
          {
            address: contract,
            abi,
            functionName: selectors.bonding,
          } as unknown as Parameters<typeof readContract>[1],
          "Initial bonding period",
        ),
        !selectors.frozenBondingEnd ? Promise.resolve(undefined) : readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, {
          address: contract, abi, functionName:'bondingEndsAt', args:[address as `0x${string}`],
        } as unknown as Parameters<typeof readContract>[1], 'Frozen bonding deadline'),
      ]);

      const bondingEndsAt =
        frozenEnd !== undefined ? frozenEnd : firstDepositTimestamp > 0n
          ? firstDepositTimestamp + bondingPeriod
          : 0n;

      return {
        firstDepositTimestamp: Number(firstDepositTimestamp),
        bondingPeriod: Number(bondingPeriod),
        bondingEndsAt: Number(bondingEndsAt),
      };
    },
    {
      revalidateOnFocus: false,
    },
  );

  return useMemo(
    () => ({
      firstDepositTimestamp: data?.firstDepositTimestamp ?? 0,
      bondingPeriod: data?.bondingPeriod ?? 0,
      bondingEndsAt: data?.bondingEndsAt ?? 0,
      isLoading,
      isValidating,
      error: error?.message || null,
      refetch: mutate,
    }),
    [data, isLoading, isValidating, error, mutate],
  );
};
