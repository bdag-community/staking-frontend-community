import { useMemo, useCallback } from "react";
import useSWRInfinite from "swr/infinite";
import { useWallet } from "./use-wallet";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { RecentHistory, Transaction } from "@/utils/interface";
import {
  getCursorKey,
  swrFetcher,
  flattenPages,
  resilientSWRConfig,
} from "@/utils/swr-helpers";

const LIVE_HISTORY_REFRESH_INTERVAL_MS = 5000;

export const useRecentHistory = () => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<RecentHistory>(
      (index, prev) =>
        getCursorKey(
          index,
          prev,
          isConnected && address ? apiEndpoint.recentHistory(address) : null,
        ),
      (url) => swrFetcher(requestApi, url),
      {
        ...resilientSWRConfig,
        refreshInterval:
          isConnected && address ? LIVE_HISTORY_REFRESH_INTERVAL_MS : 0,
        refreshWhenHidden: false,
        refreshWhenOffline: false,
      },
    );
  const history = useMemo(
    () => flattenPages<Transaction>(data ?? [], "activities"),
    [data],
  );
  const loadedPageCount = data?.length ?? 0;
  const isLoadingMore = isLoading || size > loadedPageCount;
  const isRefreshingHistory =
    isValidating && !isLoadingMore && loadedPageCount === size;

  const total = useMemo(() => data?.[0]?.total ?? 0, [data]);
  const hasMore = useMemo(() => {
    if (!data) return false;
    const lastPage = data[data.length - 1];
    return !!lastPage?.nextCursor;
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      setSize(size + 1);
    }
  }, [isLoadingMore, hasMore, setSize, size]);

  return useMemo(
    () => ({
      history,
      total,
      hasMore,
      isLoadingHistory: isLoadingMore,
      isInitialLoading: isLoading && size === 1,
      isRefreshingHistory,
      error: error?.message || null,
      loadMore,
      refetch: mutate,
    }),
    [
      history,
      total,
      hasMore,
      isLoading,
      isLoadingMore,
      isRefreshingHistory,
      size,
      error,
      loadMore,
      mutate,
    ],
  );
};
