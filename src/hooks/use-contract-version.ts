import { useMemo } from "react";
import useSWR from "swr";
import { formatEther, parseEther } from "viem";
import { readContract } from "@wagmi/core";
import { abi } from "@/contract/abi";
import { ENV, STAKING_CONTRACTS } from "@/config/env";
import { wagmiAdapter } from "@/config/reown";
import { readContractWithRetry } from "@/utils/contract-calls";
import { STAKING_CONSTANTS } from "@/utils/constants";

// `version()` only exists from V2 on; the V1 contract reverts on it.
const V1_VERSION = "1.0.0";
const FALLBACK_MIN_STAKE_RAW = parseEther(String(STAKING_CONSTANTS.MIN_STAKE));

type ContractVersion = {
  version: string;
  minStakeRaw: bigint;
};

export const useContractVersion = () => {
  const { data, error, isLoading } = useSWR(
    ["contractVersion", ENV.CHAIN.STAKING_CONTRACT_ADDRESS],
    async (): Promise<ContractVersion> => {
      const [version, minStakeRaw] = await Promise.all([
        readContractWithRetry<string>(
          wagmiAdapter.wagmiConfig,
          {
            address: ENV.CHAIN.STAKING_CONTRACT_ADDRESS,
            abi,
            functionName: "version",
          } as unknown as Parameters<typeof readContract>[1],
          "Contract version",
        ).catch(() => V1_VERSION),
        readContractWithRetry<bigint>(
          wagmiAdapter.wagmiConfig,
          {
            address: ENV.CHAIN.STAKING_CONTRACT_ADDRESS,
            abi,
            functionName: "MIN_STAKE",
          } as unknown as Parameters<typeof readContract>[1],
          "Minimum stake",
        ),
      ]);

      return { version, minStakeRaw };
    },
    {
      refreshInterval: 15000,
      revalidateOnFocus: true,
      shouldRetryOnError: false,
    },
  );

  return useMemo(() => {
    const version = data?.version ?? "unknown";
    const minStakeRaw = data?.minStakeRaw ?? FALLBACK_MIN_STAKE_RAW;

    return {
      version,
      isV2: version.startsWith("2."),
      minStake: Number(formatEther(minStakeRaw)),
      minStakeRaw,
      address: ENV.CHAIN.STAKING_CONTRACT_ADDRESS,
      contracts: STAKING_CONTRACTS,
      isLoading,
      error: error ? "Contract details unavailable" : null,
    };
  }, [data, error, isLoading]);
};
