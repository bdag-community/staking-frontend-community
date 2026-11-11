import { useMemo } from "react";
import useSWR from "swr";
import { useWallet } from "./use-wallet";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { StakerInfoResponse } from "@/utils/interface";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";

export const useStakerInfo = (poolAddress: string | null) => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();

  const { data, error, isLoading, mutate } = useSWR(
    isConnected && address && poolAddress
      ? apiEndpoint.stakerInfo(address, poolAddress)
      : null,
    (url) => swrFetcher(requestApi, url) as Promise<StakerInfoResponse>,
    resilientSWRConfig,
  );

  return useMemo(
    () => ({
      stakerInfo: data ?? null,
      isLoading,
      error: error instanceof Error ? error.message : null,
      refetch: mutate,
    }),
    [data, isLoading, error, mutate],
  );
};
