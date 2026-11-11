import { useMemo } from "react";
import useSWR from "swr";
import { apiEndpoint } from "@/config/apiEndpoints";
import useNetworkRequest from "./use-api";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";

export type VisibilityRange = "24h" | "7d" | "30d";

export type VisibilityAction =
  | "stake"
  | "unstakeRewards"
  | "claimRewards"
  | "unstakeStake"
  | "claimUnstakedStake";

export type VisibilityActionSummary = {
  action: VisibilityAction;
  attempts: number;
  submitted: number;
  confirmed: number;
  failed: number;
  reverted: number;
  stuck: number;
  replaced: number;
  successRate: number;
};

export type VisibilityTopError = {
  action: VisibilityAction;
  errorCode: string;
  errorMessage: string;
  count: number;
  lastSeenAt: string;
};

export type VisibilitySummary = {
  range: { from?: string; to?: string };
  totals: {
    attempts: number;
    confirmed: number;
    failed: number;
    reverted: number;
    stuck: number;
    successRate: number;
  };
  actions: VisibilityActionSummary[];
  topErrors: VisibilityTopError[];
};

export type VisibilityAttempt = {
  attemptId: string;
  action: VisibilityAction;
  status: string;
  success: boolean;
  stakerAddress?: string | null;
  poolAddress?: string | null;
  txHash?: string | null;
  amountFormatted?: string | null;
  lastStageAt: string;
  durationMs?: number | null;
  finalErrorCode?: string | null;
  finalErrorMessage?: string | null;
};

export type VisibilityHealth = {
  latestIndexedBlock: number;
  chainHeadBlock: number | null;
  indexerLag: number | null;
  unresolvedStatusCounts: Record<string, number>;
  lastEventAt: string | null;
};

const getRangeStart = (range: VisibilityRange) => {
  const now = Date.now();
  const hoursByRange: Record<VisibilityRange, number> = {
    "24h": 24,
    "7d": 24 * 7,
    "30d": 24 * 30,
  };

  return new Date(now - hoursByRange[range] * 60 * 60 * 1000).toISOString();
};

const withRange = (endpoint: string, from: string) => {
  const params = new URLSearchParams({ from });
  return `${endpoint}?${params.toString()}`;
};

export const useVisibilityStats = (range: VisibilityRange) => {
  const requestApi = useNetworkRequest();
  const rangeStart = useMemo(() => getRangeStart(range), [range]);
  const summaryKey = useMemo(
    () => withRange(apiEndpoint.visibilitySummary, rangeStart),
    [rangeStart],
  );
  const attemptsKey = useMemo(
    () => `${withRange(apiEndpoint.visibilityAttempts, rangeStart)}&limit=25`,
    [rangeStart],
  );

  const {
    data: summary,
    error: summaryError,
    isLoading: isSummaryLoading,
    mutate: refetchSummary,
  } = useSWR<VisibilitySummary>(
    summaryKey,
    (url) => swrFetcher(requestApi, url),
    {
      ...resilientSWRConfig,
      refreshInterval: 30000,
    },
  );

  const {
    data: attempts,
    error: attemptsError,
    isLoading: isAttemptsLoading,
    mutate: refetchAttempts,
  } = useSWR<VisibilityAttempt[]>(
    attemptsKey,
    (url) => swrFetcher(requestApi, url),
    {
      ...resilientSWRConfig,
      refreshInterval: 30000,
    },
  );

  const {
    data: health,
    error: healthError,
    isLoading: isHealthLoading,
    mutate: refetchHealth,
  } = useSWR<VisibilityHealth>(
    apiEndpoint.visibilityHealth,
    (url) => swrFetcher(requestApi, url),
    {
      ...resilientSWRConfig,
      refreshInterval: 30000,
    },
  );

  return useMemo(
    () => ({
      summary: summary ?? null,
      attempts: attempts ?? [],
      health: health ?? null,
      isLoading: isSummaryLoading || isAttemptsLoading || isHealthLoading,
      error:
        summaryError?.message ||
        attemptsError?.message ||
        healthError?.message ||
        null,
      refetch: () => {
        void refetchSummary();
        void refetchAttempts();
        void refetchHealth();
      },
    }),
    [
      summary,
      attempts,
      health,
      isSummaryLoading,
      isAttemptsLoading,
      isHealthLoading,
      summaryError,
      attemptsError,
      healthError,
      refetchSummary,
      refetchAttempts,
      refetchHealth,
    ],
  );
};
