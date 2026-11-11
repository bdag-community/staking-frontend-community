import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function displayValue<T>(
  value: T | null | undefined,
  fallback = "-",
): T | string {
  if (!value) return fallback;
  return value;
}

export function truncatedHash(
  hash: string | null | undefined,
  start = 6,
  end = 4,
  fallback = "-",
): string {
  if (!hash) return fallback;

  if (hash.length <= start + end) return hash;
  return `${hash.slice(0, start)}...${hash.slice(-end)}`;
}

export function formatNumber(
  num: number | string | null | undefined,
  decimals = 18,
  fallback = "0",
): string {
  if (num === null || num === undefined || num === "") return fallback;
  const n = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
  if (isNaN(n)) return fallback;

  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

export function formatCompactNumber(
  num: number | string | null | undefined,
  decimals = 2,
  fallback = "0",
): string {
  if (num === null || num === undefined || num === "") return fallback;
  const n = typeof num === "string" ? parseFloat(num.replace(/,/g, "")) : num;
  if (isNaN(n)) return fallback;

  const formatter = new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: decimals,
  });

  return formatter
    .formatToParts(n)
    .map((part) => (part.type === "compact" ? ` ${part.value}` : part.value))
    .join("");
}

export function formatUtcDateTime(date: Date | number): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

type TransactionErrorLike = {
  name?: string;
  message?: string;
  shortMessage?: string;
  details?: string;
};

export function getErrorMessage(error: unknown): string {
  if (!error) return "Transaction failed. Please try again later";

  const normalized =
    typeof error === "object" ? (error as TransactionErrorLike) : {};
  const message = normalized.message || "";
  const shortMessage = normalized.shortMessage || "";
  const details = normalized.details || "";
  const errorName = normalized.name || "";
  const combinedMessage = `${errorName} ${shortMessage} ${message} ${details}`.toLowerCase();

  if (shortMessage.includes("BelowMinStake")) {
    return "Amount is below the minimum required stake.";
  }
  if (
    shortMessage.includes("InsufficientLiquidStake") ||
    message.includes("InsufficientLiquidStake")
  ) {
    return "Insufficient liquid stake available.";
  }
  if (
    shortMessage.includes("InsufficientUnlockedStake") ||
    message.includes("InsufficientUnlockedStake")
  ) {
    return "Insufficient unlocked stake. Please wait for the unbonding period.";
  }
  if (shortMessage.includes("NothingToClaim")) {
    return "You have no rewards or unbonded tokens available to claim.";
  }
  if (shortMessage.includes("Total Lockdown") || shortMessage.includes("3-Week Cooldown") || shortMessage.includes("Cooldown Active")) {
    return "Your tokens are in the unbonding cooldown period. Please wait for the unbonding period to complete before claiming.";
  }
  if (shortMessage.includes("4-Week Gate Active")) {
    return "Your tokens are still in the initial bonding period. Please wait before claiming.";
  }
  if (shortMessage.includes("CannotUnstakeZero")) {
    return "You cannot unstake an amount of zero.";
  }
  if (shortMessage.includes("InvalidPool")) {
    return "The selected mining pool is invalid.";
  }
  if (shortMessage.includes("EnforcedPause")) {
    return "The contract is currently paused for maintenance.";
  }

  if (
    combinedMessage.includes("user rejected") ||
    combinedMessage.includes("user denied") ||
    combinedMessage.includes("rejected the request")
  ) {
    return "Transaction rejected in wallet.";
  }

  if (
    combinedMessage.includes("insufficient_stake_balance") ||
    combinedMessage.includes("insufficientstakebalance")
  ) {
    return shortMessage || "You do not have enough BDAG for this stake plus the network fee.";
  }

  if (
    combinedMessage.includes("total cost") &&
    combinedMessage.includes("exceeds the balance")
  ) {
    return "You do not have enough BDAG for this transaction plus the network fee. Reduce the amount or add BDAG to your wallet.";
  }

  if (combinedMessage.includes("insufficient funds")) {
    return "You do not have enough BDAG for this transaction plus the network fee. Reduce the amount or add BDAG to your wallet.";
  }

  if (
    combinedMessage.includes("nonce") &&
    (combinedMessage.includes("too low") ||
      combinedMessage.includes("lower than the current nonce") ||
      combinedMessage.includes("nonce provided for the tx is lower"))
  ) {
    return "Wallet nonce is already ahead of this transaction. Refresh the transaction status before trying again.";
  }

  if (
    combinedMessage.includes("transaction confirmation") &&
    (combinedMessage.includes("timeout") ||
      combinedMessage.includes("timed out") ||
      combinedMessage.includes("taking longer"))
  ) {
    return "Transaction submitted. Confirmation is taking longer than expected.";
  }

  if (
    combinedMessage.includes("timeout") ||
    combinedMessage.includes("timed out") ||
    combinedMessage.includes("taking longer")
  ) {
    return "Network timeout. Please try again.";
  }

  if (
    combinedMessage.includes("internal json-rpc error") ||
    combinedMessage.includes("failed to fetch") ||
    combinedMessage.includes("fetch failed") ||
    combinedMessage.includes("network") ||
    combinedMessage.includes("connection") ||
    combinedMessage.includes("rate limit") ||
    combinedMessage.includes("too many requests") ||
    combinedMessage.includes("bad gateway") ||
    combinedMessage.includes("service unavailable") ||
    combinedMessage.includes("gateway timeout")
  ) {
    return "Network is busy. Please try again shortly.";
  }

  if (shortMessage) {
    return shortMessage;
  }

  return "Transaction failed. Please try again later.";
}

// ============= STAKING CALCULATIONS =============
import { STAKING_CONSTANTS } from "@/utils/constants";

export const calculateCurrentWeeklyPool = (
  basePool: number,
  currentEpoch: number,
): number => {
  const decayMultiplier = Math.pow(
    1 - STAKING_CONSTANTS.WEEKLY_DECAY_RATE,
    currentEpoch,
  );
  return basePool * decayMultiplier;
};

export const calculateUserWeeklyReward = (
  userStaked: number,
  totalNetworkStaked: number,
  weeklyRewardPool: number,
): number => {
  if (totalNetworkStaked === 0) return 0;
  const stakerPool = weeklyRewardPool * (STAKING_CONSTANTS.STAKER_SHARE / 100);
  return (userStaked / totalNetworkStaked) * stakerPool;
};

export const calculateDynamicAPY = (
  weeklyRewardPool: number,
  totalNetworkStaked: number,
): number => {
  if (totalNetworkStaked === 0) return STAKING_CONSTANTS.TARGET_APY_MAX;

  const stakerPool = weeklyRewardPool * (STAKING_CONSTANTS.STAKER_SHARE / 100);
  const weeklyRate = stakerPool / totalNetworkStaked;
  const annualRate = weeklyRate * 52 * 100;

  return Math.min(
    Math.max(annualRate, STAKING_CONSTANTS.TARGET_APY_MIN),
    STAKING_CONSTANTS.TARGET_APY_MAX,
  );
};

export const getNextEpochCountdown = (epochStartDate: Date): number => {
  const nextEpoch = new Date(epochStartDate);
  nextEpoch.setDate(nextEpoch.getDate() + 7);
  return Math.max(0, Math.floor((nextEpoch.getTime() - Date.now()) / 1000));
};

// ============= ADDITIONAL FORMATTERS =============

export const formatBDAG = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return "0";
  return formatNumber(num, 2);
};

export const formatUSD = (num: number | string | null | undefined): string => {
  if (num === null || num === undefined) return "$0";
  const n = typeof num === "string" ? parseFloat(num) : num;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
};

export const formatCountdown = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const mins = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;

  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`;
  return `${mins}m ${secs}s`;
};

export const formatPercentage = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export function formatTimeAgo(date: Date | string | number): string {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60)
    return `${diffInSeconds} sec${diffInSeconds !== 1 ? "s" : ""} ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60)
    return `${diffInMinutes} min${diffInMinutes !== 1 ? "s" : ""} ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30)
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12)
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`;
}
