import { useMemo, useCallback } from "react";
import useSWR from "swr";
import { useWallet } from "./use-wallet";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { UserRewardsResponse } from "@/utils/interface";
import {
  isRetryableRequestError,
  resilientSWRConfig,
  swrFetcher,
} from "@/utils/swr-helpers";
import { formatNumber } from "@/lib/utils";
import { useDelayedLoading } from "./use-delayed-loading";

export const useUserRewards = () => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<UserRewardsResponse>(
      isConnected && address ? apiEndpoint.rewards(address) : null,
      (url) => swrFetcher(requestApi, url),
      resilientSWRConfig,
    );
  const isRetrying = Boolean(error && isRetryableRequestError(error));
  const isTakingLonger = useDelayedLoading(
    isLoading || isValidating || isRetrying,
  );

  const formattedTotalPending = useMemo(
    () => formatNumber(data?.totalPendingRewards ?? "0", 2),
    [data],
  );

  return useMemo(
    () => ({
      totalPendingRewards: data?.totalPendingRewards ?? "0",
      formattedTotalPending,
      poolRewards: data?.pools ?? [],
      isLoading,
      isValidating,
      isRetrying,
      isTakingLonger,
      error: error?.message || null,
      refetch: mutate,
    }),
    [
      data,
      formattedTotalPending,
      isLoading,
      isValidating,
      isRetrying,
      isTakingLonger,
      error,
      mutate,
    ],
  );
};
