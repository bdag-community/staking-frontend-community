import { useMemo } from "react";
import useSWR from "swr";
import { useWallet } from "./use-wallet";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { UserStakedPoolsResponse } from "@/utils/interface";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";

export const useUserStakedPools = () => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();

  const { data, error, isLoading, isValidating, mutate } =
    useSWR<UserStakedPoolsResponse>(
      isConnected && address ? apiEndpoint.stakedPools(address) : null,
      (url) => swrFetcher(requestApi, url),
      resilientSWRConfig
    );

  return useMemo(
    () => ({
      stakedPools: data?.pools ?? [],
      isLoading,
      isValidating,
      error: error?.message || null,
      refetch: mutate,
    }),
    [data, isLoading, isValidating, error, mutate]
  );
};
