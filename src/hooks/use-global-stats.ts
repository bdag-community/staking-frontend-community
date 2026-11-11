import { useMemo } from "react";
import useSWR from "swr";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { GlobalStatsResponse } from "@/utils/interface";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";

export const useGlobalStats = () => {
  const requestApi = useNetworkRequest();

  const { data, error, isLoading, mutate } = useSWR<GlobalStatsResponse>(
    apiEndpoint.globalStats,
    (url) => swrFetcher(requestApi, url),
    resilientSWRConfig,
  );

  return useMemo(
    () => ({
      globalStats: data || null,
      isLoading,
      error: error?.message || null,
      refetch: mutate,
    }),
    [data, isLoading, error, mutate],
  );
};
