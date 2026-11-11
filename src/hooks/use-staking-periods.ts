import { useMemo } from "react";
import useSWR from "swr";
import { readContract } from "@wagmi/core";
import { abi } from "@/contract/abi";
import { ENV } from "@/config/env";
import { resolveStakingContractAddress, type StakingContractVersion } from '@/lib/staking-contract';
import { wagmiAdapter } from "@/config/reown";
import { readContractWithRetry } from "@/utils/contract-calls";
import { STAKING_PERIOD_FALLBACKS_SECONDS } from "@/utils/constants";
import {
  formatDurationHyphenated,
  formatDurationPlain,
} from "@/utils/duration";

type StakingPeriods = {
  initialBondingPeriod: number;
  unbondingPeriod: number;
  epochDuration: number;
};

const fallbackPeriods: StakingPeriods = {
  initialBondingPeriod: STAKING_PERIOD_FALLBACKS_SECONDS.INITIAL_BONDING_PERIOD,
  unbondingPeriod: STAKING_PERIOD_FALLBACKS_SECONDS.UNBONDING_PERIOD,
  epochDuration: STAKING_PERIOD_FALLBACKS_SECONDS.EPOCH_DURATION,
};

export const useStakingPeriods = ({version='current'}: {version?: StakingContractVersion} = {}) => {
  const contract = resolveStakingContractAddress(version);
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    [
      "stakingPeriods",
      ENV.CHAIN.ID,
      ENV.CHAIN.RPC_URL,
      contract,
      ENV.LEGACY_ONLY,
    ],
    async (): Promise<StakingPeriods> => {
      const [initialBondingPeriod, unbondingPeriod, epochDuration] =
        await Promise.all([
          readContractWithRetry<bigint>(
            wagmiAdapter.wagmiConfig,
            {
              address: contract,
              abi,
              functionName: ENV.LEGACY_ONLY ? "INITIAL_BONDING_PERIOD" : "bondingPeriod",
            } as unknown as Parameters<typeof readContract>[1],
            "Initial bonding period",
          ),
          readContractWithRetry<bigint>(
            wagmiAdapter.wagmiConfig,
            {
              address: contract,
              abi,
              functionName: ENV.LEGACY_ONLY ? "UNBONDING_PERIOD" : "unbondingPeriod",
            } as unknown as Parameters<typeof readContract>[1],
            "Unbonding period",
          ),
          readContractWithRetry<bigint>(
            wagmiAdapter.wagmiConfig,
            {
              address: contract,
              abi,
              functionName: ENV.LEGACY_ONLY ? "EPOCH_DURATION" : "epochDuration",
            } as unknown as Parameters<typeof readContract>[1],
            "Epoch duration",
          ),
        ]);

      if ([initialBondingPeriod, unbondingPeriod, epochDuration].some(value => typeof value !== "bigint" || value <= 0n || value > BigInt(Number.MAX_SAFE_INTEGER))) throw new Error("Invalid staking timing policy.");
      return {
        initialBondingPeriod: Number(initialBondingPeriod),
        unbondingPeriod: Number(unbondingPeriod),
        epochDuration: Number(epochDuration),
      };
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 10_000,
      shouldRetryOnError: false,
    },
  );

  return useMemo(() => {
    const periods = data ?? fallbackPeriods;

    return {
      ...periods,
      formatted: {
        initialBondingPlain: formatDurationPlain(periods.initialBondingPeriod),
        initialBondingHyphenated: formatDurationHyphenated(
          periods.initialBondingPeriod,
        ),
        initialBondingTitle: formatDurationHyphenated(
          periods.initialBondingPeriod,
          { capitalize: true },
        ),
        unbondingPlain: formatDurationPlain(periods.unbondingPeriod),
        unbondingHyphenated: formatDurationHyphenated(periods.unbondingPeriod),
        unbondingTitle: formatDurationHyphenated(periods.unbondingPeriod, {
          capitalize: true,
        }),
        epochPlain: formatDurationPlain(periods.epochDuration),
        epochHyphenated: formatDurationHyphenated(periods.epochDuration),
        epochTitle: formatDurationHyphenated(periods.epochDuration, {
          capitalize: true,
        }),
      },
      isLoading,
      isValidating,
      error: error?.message || null,
      refetch: mutate,
    };
  }, [data, error, isLoading, isValidating, mutate]);
};
