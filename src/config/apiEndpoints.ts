export const apiMethods = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  DELETE: "DELETE",
} as const;

export const apiEndpoint = {
  totalStaked: (address: string) => `/staker/totalStaked/${address}`,
  stakerInfo: (stakerAddress: string, poolAddress: string) =>
    `/staker/${stakerAddress}/pool/${poolAddress}`,
  recentHistory: (address: string) => `/staker/recentHistory/${address}`,
  rewards: (address: string) => `/staker/rewards/${address}`,
  stakedPools: (address: string) => `/staker/pools/${address}`,
  poolAddresses: "/pools?status=all",
  activePoolAddresses: "/pools/active",
  poolMarket: (sort = "staked") => `/pools?sort=${encodeURIComponent(sort)}`,
  poolFigures: (address: string) => `/pools/${address}/figures`,
  registerPool: "/pools/register",
  contracts: "/contracts",
  credentials: (wallet: string) => `/credentials/${wallet}`,
  legacy: (wallet: string) => `/staker/${wallet}/legacy`,
  epochStatus: "/epoch/status",
  globalStats: "/global-stats",
  visibilitySummary: "/visibility/summary",
  visibilityAttempts: "/visibility/attempts",
  visibilityHealth: "/visibility/health",
};
