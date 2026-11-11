import { ENV } from "@/config/env";

export const ENV_CONSTANTS = {
  apiBaseUrl: ENV.STAKING_API_URL,
};

export const STAKING_CONSTANTS = {
  WEEKLY_DECAY_RATE: 0.002, // 0.2% reduction per week
  MINER_SHARE: 70,
  STAKER_SHARE: 30,
  TARGET_APY_MIN: 8,
  TARGET_APY_MAX: 10,
  BUCKET_A_COOLDOWN_DAYS: 21,
  BUCKET_B_REWARD_LOCK_DAYS: 364, // 52-week lock
  BASE_WEEKLY_EMISSION: 1000000, // Base tokens emitted per week
  UNBONDING_DAYS: 21,
  MIN_STAKE: 0.001,
} as const;

export const STAKING_PERIOD_FALLBACKS_SECONDS = {
  INITIAL_BONDING_PERIOD: 4 * 7 * 24 * 60 * 60,
  UNBONDING_PERIOD: 3 * 7 * 24 * 60 * 60,
  EPOCH_DURATION: 7 * 24 * 60 * 60,
} as const;
