export type PoolSortable = {
  poolAddress: string;
  totalStaked?: string | number;
  totalStakers?: number;
  apy?: { yearlyApy?: number; weeklyApy?: number } | null;
};

export type PoolSort = "apy" | "staked" | "stakers";

export const sortPools = <T extends PoolSortable>(pools: T[], sort: PoolSort) =>
  [...pools].sort((a, b) => {
    if (sort === "apy") return Number(b.apy?.yearlyApy ?? 0) - Number(a.apy?.yearlyApy ?? 0);
    if (sort === "stakers") return Number(b.totalStakers ?? 0) - Number(a.totalStakers ?? 0);
    return Number(b.totalStaked ?? 0) - Number(a.totalStaked ?? 0);
  });
