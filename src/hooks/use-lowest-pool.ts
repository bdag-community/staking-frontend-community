import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { usePoolAddresses } from "./use-pool-addresses";
import { PoolData } from "@/utils/interface";

interface LowestPoolResult {
  lowestPool: PoolData;
  totalStaked: number;
  weeklyYeild: number;
  totalCount: number;
  avgApy: number;
}

export const useLowestPool = () => {
  const { pools = [], loading: poolAddressesLoading } = usePoolAddresses();

  const findLowestPool =
    useCallback(async (): Promise<LowestPoolResult | null> => {
      if (!pools.length) return null;

      let lowestPool = pools[0];
      let lowestAmount = Number(pools[0].totalStaked ?? Infinity);

      let totalStaked = 0;
      let totalWeeklyApy = 0;
      let weightedApySum = 0;
      let count = 0;

      for (const pool of pools) {
        const stake = Number(pool.totalStaked ?? 0);
        const yearlyApy = Number(pool.apy?.yearlyApy ?? 0);
        const weeklyApy = Number(pool.apy?.weeklyApy ?? 0);

        totalStaked += stake;
        totalWeeklyApy += weeklyApy;
        weightedApySum += yearlyApy * stake;
        count++;

        if (stake < lowestAmount) {
          lowestAmount = stake;
          lowestPool = pool;
        }
      }

      const avgApy = totalStaked > 0 ? weightedApySum / totalStaked : 0;

      return {
        lowestPool,
        totalStaked,
        weeklyYeild: count > 0 ? totalWeeklyApy / count : 0,
        totalCount: count,
        avgApy,
      };
    }, [pools]);

  const { data, isLoading, mutate } = useSWR<LowestPoolResult | null>(
    pools.length > 0 ? ["lowest-pool", pools.map((p) => p.poolAddress)] : null,
    findLowestPool,
    {
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    },
  );

  return useMemo(
    () => ({
      getLowestStakedPool: mutate,
      lowestPool: data?.lowestPool ?? null,
      lowestPoolApy: data?.lowestPool?.apy?.yearlyApy ?? 0,
      avgApy: data?.avgApy ?? 0,
      totalStaked: data?.totalStaked ?? 0,
      weeklyYeild: data?.weeklyYeild ?? 0,
      totalCount: data?.totalCount ?? 0,
      isLoading: isLoading || poolAddressesLoading,
    }),
    [mutate, data, isLoading, poolAddressesLoading],
  );
};
