import { useMemo } from "react";
import useSWR from "swr";
import { getBlockNumber, readContract } from "@wagmi/core";
import type { Address } from "viem";
import { abi } from "@/contract/abi";
import { wagmiAdapter } from "@/config/reown";
import { useWallet } from "@/hooks/use-wallet";
import { readContractWithRetry } from "@/utils/contract-calls";
import { resolveStakingContractAddress } from "@/lib/staking-contract";

export type LegacyPosition = { pool: Address; shares: bigint; principal: bigint; liquidValue: bigint; blockNumber: bigint };

export const mergeLegacyPoolAddresses = (...sources: string[][]) => [...new Set(sources.flat().map((pool) => pool.toLowerCase()).filter((pool) => /^0x[a-f0-9]{40}$/.test(pool)))];

/** Reads retained V1 positions from chain; activity history is never used as a balance. */
export const useLegacyPositions = (poolAddresses: string[]) => {
  const { address, isConnected } = useWallet();
  const contractAddress = resolveStakingContractAddress("v1");
  const pools = useMemo(
    () => [...new Set(poolAddresses.map((pool) => pool.toLowerCase()))].filter((pool) => /^0x[a-f0-9]{40}$/.test(pool)) as Address[],
    [poolAddresses],
  );
  const { data, error, isLoading, mutate } = useSWR(
    isConnected && address && pools.length ? ["legacy-positions", contractAddress, address, pools] : null,
    async () => {
      const blockNumber = await getBlockNumber(wagmiAdapter.wagmiConfig);
      const positions = await Promise.all(pools.map(async (pool) => {
        const at = { blockNumber };
        const [shares, principal, assets, totalShares] = await Promise.all([
          readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, { address: contractAddress, abi, functionName: "stakerPoolShares", args: [address as Address, pool], ...at } as unknown as Parameters<typeof readContract>[1], "Legacy pool shares"),
          readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, { address: contractAddress, abi, functionName: "stakerPrincipalBDAG", args: [address as Address, pool], ...at } as unknown as Parameters<typeof readContract>[1], "Legacy pool principal"),
          readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, { address: contractAddress, abi, functionName: "poolTotalAssets", args: [pool], ...at } as unknown as Parameters<typeof readContract>[1], "Legacy pool assets"),
          readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, { address: contractAddress, abi, functionName: "poolTotalShares", args: [pool], ...at } as unknown as Parameters<typeof readContract>[1], "Legacy pool shares total"),
        ]);
        const liquidValue = totalShares > 0n ? shares * assets / totalShares : 0n;
        return { pool, shares, principal, liquidValue, blockNumber } satisfies LegacyPosition;
      }));
      return positions;
    },
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
  return { positions: data ?? [], error: error?.message ?? null, isLoading, refetch: mutate };
};
