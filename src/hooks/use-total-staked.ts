import { useMemo, useCallback } from "react";
import useSWR from "swr";
import { useWallet } from "./use-wallet";
import { formatNumber } from "@/lib/utils";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { TotalStakedResponse } from "@/utils/interface";
import {
  isRetryableRequestError,
  resilientSWRConfig,
  swrFetcher,
} from "@/utils/swr-helpers";
import { useDelayedLoading } from "./use-delayed-loading";

export const useTotalStaked = () => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    isConnected && address ? apiEndpoint.totalStaked(address) : null,
    (url) => swrFetcher(requestApi, url),
    resilientSWRConfig,
  );
  const isRetrying = Boolean(error && isRetryableRequestError(error));
  const isTakingLonger = useDelayedLoading(
    isLoading || isValidating || isRetrying,
  );

  const totalStaked = useMemo(() => data?.totalStaked ?? "0", [data]);
  const totalClaimedAmount = useMemo(
    () => data?.totalClaimedAmount ?? "0",
    [data],
  );
  const rewardsClaimed = useMemo(() => data?.rewardsClaimed ?? "0", [data]);
  const stakedFundsReclaimed = useMemo(
    () => data?.stakedFundsReclaimed ?? "0",
    [data],
  );
  const weeklyEarnings = useMemo(() => data?.weeklyEarnings ?? "0", [data]);
  const totalUnbonding = useMemo(() => data?.totalUnbonding ?? "0", [data]);
  const pools = useMemo(() => data?.pools ?? [], [data]);

  const formattedTotalStaked = useMemo(
    () => formatNumber(totalStaked, 2),
    [totalStaked],
  );

  const formattedTotalClaimed = useMemo(
    () => formatNumber(totalClaimedAmount, 2),
    [totalClaimedAmount],
  );

  return useMemo(
    () => ({
      totalStaked,
      totalClaimedAmount,
      rewardsClaimed,
      stakedFundsReclaimed,
      weeklyEarnings,
      totalUnbonding,
      pools,
      formattedTotalStaked,
      formattedTotalClaimed,
      isLoading,
      isValidating,
      isRetrying,
      isTakingLonger,
      error: error instanceof Error ? error.message : null,
      refetch: mutate,
    }),
    [
      totalStaked,
      totalClaimedAmount,
      rewardsClaimed,
      stakedFundsReclaimed,
      weeklyEarnings,
      totalUnbonding,
      pools,
      formattedTotalStaked,
      formattedTotalClaimed,
      isLoading,
      isValidating,
      isRetrying,
      isTakingLonger,
      error,
      mutate,
    ],
  );
};
