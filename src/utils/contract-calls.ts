import {
  readContract,
  simulateContract,
  waitForTransactionReceipt,
} from "@wagmi/core";

export const CONTRACT_READ_TIMEOUT_MS = 10000;
export const CONTRACT_WRITE_PREP_TIMEOUT_MS = 30000;
export const TRANSACTION_CONFIRMATION_TIMEOUT_MS = 3 * 60 * 1000;

const DEFAULT_ATTEMPTS = 2;
const MAX_RETRY_DELAY_MS = 10000;

class ContractCallTimeoutError extends Error {
  constructor(label: string) {
    super(`${label} is taking longer than expected.`);
    this.name = "ContractCallTimeoutError";
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number) => {
  const baseDelay = Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS);
  return baseDelay + Math.floor(Math.random() * 500);
};

const getErrorText = (error: unknown) => {
  if (!error || typeof error !== "object") return "";

  const err = error as {
    name?: string;
    message?: string;
    shortMessage?: string;
    details?: string;
    cause?: unknown;
  };

  return [
    err.name,
    err.shortMessage,
    err.message,
    err.details,
    getErrorText(err.cause),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export const isUserRejectedContractError = (error: unknown) => {
  const text = getErrorText(error);
  return (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("rejected the request") ||
    text.includes("request rejected")
  );
};

const isDeterministicContractError = (error: unknown) => {
  const text = getErrorText(error);
  return (
    isUserRejectedContractError(error) ||
    text.includes("execution reverted") ||
    text.includes("contract function execution reverted") ||
    text.includes("insufficient funds") ||
    text.includes("belowminstake") ||
    text.includes("insufficientliquidstake") ||
    text.includes("insufficientunlockedstake") ||
    text.includes("nothingtoclaim") ||
    text.includes("cannotunstakezero") ||
    text.includes("invalidpool") ||
    text.includes("enforcedpause")
  );
};

export const isRetryableContractError = (error: unknown) => {
  if (isDeterministicContractError(error)) return false;

  const text = getErrorText(error);
  return (
    error instanceof ContractCallTimeoutError ||
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("abort") ||
    text.includes("network") ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("connection") ||
    text.includes("rate limit") ||
    text.includes("too many requests") ||
    text.includes("internal json-rpc error") ||
    text.includes("bad gateway") ||
    text.includes("service unavailable") ||
    text.includes("gateway timeout") ||
    /\b(408|425|429|500|502|503|504)\b/.test(text)
  );
};

const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
) =>
  new Promise<T>((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      settled = true;
      reject(new ContractCallTimeoutError(label));
    }, timeoutMs);

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      },
    );
  });

export const runContractCallWithRetry = async <T>(
  operation: () => Promise<T>,
  options?: {
    attempts?: number;
    timeoutMs?: number;
    label?: string;
  },
) => {
  const attempts = options?.attempts ?? DEFAULT_ATTEMPTS;
  const timeoutMs = options?.timeoutMs ?? CONTRACT_READ_TIMEOUT_MS;
  const label = options?.label ?? "Contract call";
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await withTimeout(operation(), timeoutMs, label);
    } catch (error) {
      lastError = error;

      if (attempt >= attempts - 1 || !isRetryableContractError(error)) {
        throw error;
      }

      await sleep(getRetryDelay(attempt));
    }
  }

  throw lastError;
};

export const readContractWithRetry = <T>(
  config: Parameters<typeof readContract>[0],
  parameters: Parameters<typeof readContract>[1],
  label = "Contract read",
) =>
  runContractCallWithRetry(
    () => readContract(config, parameters) as Promise<T>,
    {
      label,
      timeoutMs: CONTRACT_READ_TIMEOUT_MS,
    },
  );

export const simulateContractWithRetry = (
  config: Parameters<typeof simulateContract>[0],
  parameters: Parameters<typeof simulateContract>[1],
  label = "Contract preparation",
) => {
  const simulationParameters = {
    blockTag: "pending",
    ...parameters,
  } as Parameters<typeof simulateContract>[1];

  return runContractCallWithRetry(
    () => simulateContract(config, simulationParameters),
    {
      label,
      timeoutMs: CONTRACT_WRITE_PREP_TIMEOUT_MS,
    },
  );
};

export const waitForTransactionReceiptWithRetry = <T>(
  config: Parameters<typeof waitForTransactionReceipt>[0],
  parameters: Parameters<typeof waitForTransactionReceipt>[1],
  label = "Transaction confirmation",
) =>
  runContractCallWithRetry(
    () => waitForTransactionReceipt(config, parameters) as Promise<T>,
    {
      attempts: 1,
      label,
      timeoutMs: TRANSACTION_CONFIRMATION_TIMEOUT_MS,
    },
  );
