import useSWR, { useSWRConfig } from "swr";
import { useMemo, useState, useEffect } from "react";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";
import { useRefreshBalances } from "./use-refresh-balances";

interface EpochStatus {
  currentEpoch: number;
  genesisTime: number;
  nextEpochStartTime: number;
  epochDuration?: number;
}

// One refresh per observed rollover even when several page components subscribe.
// A separate SWR provider/network does not share this marker.
const observedEpochs = new WeakMap<object, number>();

export const useEpochStatus = () => {
  const requestApi = useNetworkRequest();
  const { refresh } = useRefreshBalances();
  const { cache } = useSWRConfig();

  const { data, error, isLoading, mutate } = useSWR<EpochStatus>(
    apiEndpoint.epochStatus,
    (url) => swrFetcher(requestApi, url),
    { ...resilientSWRConfig, refreshInterval: 10000, revalidateOnFocus: true },
  );

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow((previous) => Math.max(previous, Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!data || error || !Number.isSafeInteger(data.currentEpoch)) return;
    const previous = observedEpochs.get(cache);
    if (previous === undefined || data.currentEpoch > previous) {
      observedEpochs.set(cache, data.currentEpoch);
      if (previous !== undefined) refresh();
    }
  }, [data, error, cache, refresh]);

  const valid = Boolean(data && Number.isSafeInteger(data.currentEpoch) && data.currentEpoch >= 0 &&
    Number.isSafeInteger(data.nextEpochStartTime) && data.nextEpochStartTime > 0);
  const statusError = error instanceof Error ? error.message : error ? 'Epoch service unavailable.' :
    data && !valid ? 'Epoch clock unavailable.' : null;
  const timeRemaining = data && valid && !statusError ? Math.max(0, Math.ceil((data.nextEpochStartTime - now) / 1000)) : 0;

  return useMemo(() => {
    return {
      epoch: data?.currentEpoch || 0,
      timeRemaining,
      isAwaitingConfirmation: valid && !statusError && timeRemaining === 0,
      epochDuration: data?.epochDuration ?? 0,
      genesisTime: data?.genesisTime || 0,
      nextEpochStartTime: data?.nextEpochStartTime || 0,
      loading: isLoading,
      error: statusError,
      refetch: mutate,
    };
  }, [data, timeRemaining, valid, isLoading, statusError, mutate]);
};
