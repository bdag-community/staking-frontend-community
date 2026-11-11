import { useCallback, useEffect, useMemo } from "react";
import useSWRInfinite from "swr/infinite";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { PoolAddressesResponse, PoolData } from "@/utils/interface";
import {
  getCursorKey,
  swrFetcher,
  flattenPages,
  resilientSWRConfig,
} from "@/utils/swr-helpers";

export const usePoolAddresses = ({ includeInactive = false }: { includeInactive?: boolean } = {}) => {
  const requestApi = useNetworkRequest();

  const { data, error, size, setSize, isLoading, isValidating, mutate } =
    useSWRInfinite<PoolAddressesResponse>(
      (index, prev) =>
        getCursorKey(index, prev, includeInactive ? apiEndpoint.poolAddresses : apiEndpoint.activePoolAddresses),
      (url) => swrFetcher(requestApi, url),
      resilientSWRConfig,
    );

  const pools = useMemo(() => flattenPages<PoolData>(data, "pools"), [data]);

  const hasMore = useMemo(() => {
    if (!data) return false;
    const lastPage = data[data.length - 1];
    return !!lastPage?.nextCursor;
  }, [data]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isValidating && hasMore) {
      setSize(size + 1);
    }
  }, [isLoading, isValidating, hasMore, setSize, size]);

  // Legacy discovery needs the complete known directory so eventless V1
  // positions are still read. Bound the automatic pagination to keep a bad
  // cursor from creating an unbounded request loop.
  useEffect(() => {
    if (includeInactive && hasMore && size < 8 && !isLoading && !isValidating) {
      setSize(size + 1);
    }
  }, [includeInactive, hasMore, size, isLoading, isValidating, setSize]);

  return useMemo(
    () => ({
      pools,
      hasMore,
      loading: isLoading || (size > 0 && isValidating),
      isInitialLoading: isLoading && size === 1,
      error: error?.message || null,
      loadMore,
      refetch: mutate,
    }),
    [pools, hasMore, isLoading, size, isValidating, error, loadMore, mutate],
  );
};
