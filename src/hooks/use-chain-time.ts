import { useEffect, useMemo, useState } from "react";
import { getBlock } from "@wagmi/core";
import useSWR from "swr";
import { wagmiAdapter } from "@/config/reown";

interface ChainTimeAnchor {
  chainTimestamp: number;
  wallTime: number;
}

export const useChainTime = () => {
  const [clockTick, setClockTick] = useState(() => Date.now());
  const [timeAnchor, setTimeAnchor] = useState<ChainTimeAnchor | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "latest-chain-time",
    async () => {
      const block = await getBlock(wagmiAdapter.wagmiConfig, {
        blockTag: "pending",
      }).catch(() =>
        getBlock(wagmiAdapter.wagmiConfig, {
          blockTag: "latest",
        }),
      );

      return {
        blockTimestamp: Number(block.timestamp),
        fetchedAt: Date.now(),
      };
    },
    {
      refreshInterval: 2000,
      revalidateOnFocus: true,
    },
  );

  useEffect(() => {
    if (!data) return;

    setTimeAnchor((previousAnchor) => {
      if (!previousAnchor) {
        return {
          chainTimestamp: data.blockTimestamp,
          wallTime: data.fetchedAt,
        };
      }

      const projectedPreviousTime =
        previousAnchor.chainTimestamp +
        Math.max(
          0,
          Math.floor((data.fetchedAt - previousAnchor.wallTime) / 1000),
        );

      return {
        chainTimestamp: Math.max(data.blockTimestamp, projectedPreviousTime),
        wallTime: data.fetchedAt,
      };
    });
  }, [data]);

  const chainTime = useMemo(() => {
    if (!timeAnchor) return undefined;
    const elapsedSeconds = Math.max(
      0,
      Math.floor((clockTick - timeAnchor.wallTime) / 1000),
    );
    return timeAnchor.chainTimestamp + elapsedSeconds;
  }, [timeAnchor, clockTick]);

  return useMemo(
    () => ({
      chainTime,
      latestBlockTime: data?.blockTimestamp,
      isLoading,
      isValidating,
      error: error?.message || null,
      refetch: mutate,
    }),
    [chainTime, data?.blockTimestamp, isLoading, isValidating, error, mutate],
  );
};
