import { ENV } from "@/config/env";

export type StakingContractVersion = "current" | "v1" | "v2";

/** Address selection preserves the retained proxy boundary; it never migrates positions. */
export const resolveStakingContractAddress = (
  version: StakingContractVersion = "current",
) => {
  if (version === "v1") return ENV.CHAIN.STAKING_V1_ADDRESS;
  if (version === "v2") return ENV.CHAIN.STAKING_V2_ADDRESS;
  return ENV.CHAIN.STAKING_CONTRACT_ADDRESS;
};

