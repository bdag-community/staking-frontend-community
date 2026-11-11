import { ENV } from "@/config/env";
import { getErrorMessage } from "@/lib/utils";
import type { StakingAction } from "@/hooks/use-staking-contract";

export type VisibilityStage =
  | "started"
  | "simulation_succeeded"
  | "simulation_failed"
  | "wallet_rejected"
  | "tx_submitted"
  | "confirmation_pending"
  | "confirmed"
  | "reverted"
  | "failed"
  | "stuck"
  | "replaced";

export type VisibilityEventPayload = {
  attemptId?: string | null;
  action: StakingAction;
  stage: VisibilityStage;
  success?: boolean;
  stakerAddress?: string | null;
  poolAddress?: string | null;
  txHash?: string | null;
  amountRaw?: string | null;
  amountFormatted?: string | null;
  nonce?: number | null;
  blockNumber?: number | null;
  durationMs?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown> | null;
};

export const createVisibilityAttemptId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getVisibilityErrorPayload = (error: unknown) => {
  const err = error as { name?: string; code?: string; shortMessage?: string };
  return {
    errorCode: err?.code || err?.name || "UNKNOWN_ERROR",
    errorMessage: err?.shortMessage || getErrorMessage(error),
  };
};

export const trackVisibilityEvent = (payload: VisibilityEventPayload) => {
  if (!ENV.STAKING_API_URL) return;

  const body = JSON.stringify({
    ...payload,
    metadata: {
      route: window.location.pathname,
      frontendMode: import.meta.env.MODE,
      userAgent: window.navigator.userAgent,
      ...payload.metadata,
    },
  });

  const url = `${ENV.STAKING_API_URL}/visibility/events`;

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
};
