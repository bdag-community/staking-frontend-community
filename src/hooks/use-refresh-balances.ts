import { useSWRConfig } from "swr";
import { useWallet } from "./use-wallet";
import { apiEndpoint } from "@/config/apiEndpoints";
import { useCallback } from "react";

export const useRefreshBalances = () => {
  const { address, refresh: refreshWallet } = useWallet();
  const { mutate } = useSWRConfig();

  const refresh = useCallback(() => {
    if (!address) return;

    // Refresh native balance
    refreshWallet();

    // Mutate simple keys
    mutate(apiEndpoint.totalStaked(address));
    mutate(apiEndpoint.rewards(address));
    mutate(apiEndpoint.stakedPools(address));
    mutate(apiEndpoint.globalStats);
    mutate((key: unknown) =>
      Array.isArray(key) &&
      (key[0] === "unbondingRequests" || key[0] === "initialBondingPeriod") &&
      typeof key[key.length - 1] === "string" &&
      key[key.length - 1].toLowerCase() === address.toLowerCase(),
    );

    mutate(
      (key: unknown) =>
        typeof key === "string" &&
        key.startsWith(apiEndpoint.recentHistory(address)),
    );
  }, [address, mutate, refreshWallet]);

  const refreshWithIntervals = useCallback(() => {
    const intervals = [0, 3000, 15000, 30000, 60000];
    intervals.forEach((delay) => {
      setTimeout(() => {
        refresh();
      }, delay);
    });
  }, [refresh]);

  return { refresh, refreshWithIntervals };
};
