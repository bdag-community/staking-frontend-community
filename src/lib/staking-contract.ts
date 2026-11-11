import { ENV } from "@/config/env";

export type StakingContractVersion = "current" | "v1" | "v2";

/** Original Mainnet V1 has constants, but no V2 policy/saved-deadline getters. */
export function stakingTimingSelectors(input: {chainId: number; version: StakingContractVersion; legacyOnly: boolean}) {
  const original = input.legacyOnly || (input.chainId === 1404 && input.version === 'v1');
  return original
    ? {bonding:'INITIAL_BONDING_PERIOD', unbonding:'UNBONDING_PERIOD', epoch:'EPOCH_DURATION', frozenBondingEnd:false} as const
    : {bonding:'bondingPeriod', unbonding:'unbondingPeriod', epoch:'epochDuration', frozenBondingEnd:true} as const;
}

/** Address selection preserves the retained proxy boundary; it never migrates positions. */
export const resolveStakingContractAddress = (
  version: StakingContractVersion = "current",
) => {
  if (version === "v1") return ENV.CHAIN.STAKING_V1_ADDRESS;
  if (version === "v2") return ENV.CHAIN.STAKING_V2_ADDRESS;
  return ENV.CHAIN.STAKING_CONTRACT_ADDRESS;
};

