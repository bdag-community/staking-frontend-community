export type StakingActionId = "stake" | "unstake" | "claim" | "rewards";

export const ACTIONS: Record<StakingActionId, {
  title: string;
  description: string;
  contractCall: string;
  timeline: string;
  fee: string;
}> = {
  stake: {
    title: "Stake BDAG",
    description: "Deposit BDAG into a mining pool. Your first four weeks are an initial bonding period before rewards accrue.",
    contractCall: "stake(amount, pool)",
    timeline: "Initial bonding · 4 weeks",
    fee: "No platform fee; network gas applies",
  },
  unstake: {
    title: "Unstake",
    description: "Start the on-chain unbonding period. The release is rounded to the next epoch end and the exact UTC date is shown before you sign.",
    contractCall: "unstake(amount, pools[])",
    timeline: "Unbonding · chain-defined",
    fee: "No platform fee; network gas applies",
  },
  claim: {
    title: "Claim",
    description: "Once unbonding matures, claimStake settles your unstaked principal and rewards together in one transaction.",
    contractCall: "claimStake(pool)",
    timeline: "Available after the displayed release date",
    fee: "No platform fee; network gas applies",
  },
  rewards: {
    title: "Rewards",
    description: "Rewards are share-price appreciation. There is no separate rewards transaction; use Unstake to begin a claimable exit.",
    contractCall: "Share-price appreciation",
    timeline: "Accrues after initial bonding",
    fee: "No platform fee; network gas applies",
  },
};
