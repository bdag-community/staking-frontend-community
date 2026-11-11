export interface networkParamsTypes {
  endpoint: string;
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  url?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  headers?: {
    totalCount?: string | null;
  };
}

export interface TotalStakedResponse {
  totalStaked: string;
  totalClaimedAmount: string;
  rewardsClaimed?: string;
  stakedFundsReclaimed?: string;
  weeklyEarnings?: string;
  totalUnbonding?: string;
  pools?: {
    poolAddress: string;
    amount: string;
    weeklyEarnings?: string;
    unbondingAmount?: string;
  }[];
}

export interface PoolAPY {
  yearlyApy: number;
  weeklyApy: number;
  totalStaked: string;
  hourlyApy?: number;
  yearlyYield?: string;
  weeklyYield?: string;
}

export interface PoolData {
  poolAddress: string;
  name?: string;
  subtitle?: string;
  status?: string;
  tags?: string[];
  totalStakers: number;
  totalStaked: string;
  apy: PoolAPY;
  terms?: string;
  pitch?: string;
  openForDelegation?: boolean;
}

export interface PoolAddressesResponse {
  pools: PoolData[];
  nextCursor: string | null;
  totalCount: number;
}

export interface Transaction {
  id: number;
  txHash: string;
  blockNumber: number;
  timestamp: string;
  logIndex: number;
  eventType: string;
  stakerAddress: string;
  poolAddress: string;
  fromPoolAddress?: string | null;
  toPoolAddress?: string | null;
  amount: string;
  rawAmount: string;
  balanceAfter?: string | null;
  balanceAfterRaw?: string | null;
  stakedBalanceAfter?: string;
  stakedBalanceAfterRaw?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RecentHistory {
  activities: Transaction[];
  total: number;
  nextCursor: string | null;
}

export interface EpochStatus {
  currentEpoch: number;
  timeToNextEpoch: number;
  genesisTime: number;
  nextEpochStartTime: number;
  totalNetworkStaked?: string;
}

export interface GlobalStatsResponse {
  activePoolsCount: number;
  inactivePoolsCount: number;
  totalStaked: string;
  weeklyApy: number;
  totalPoolsCount: number;
  epoch: number;
  avgApy: number;
}

export interface StakerInfoResponse {
  stakedAmount: string;
  pendingReward: string;
  unbondingRequests: unknown[];
}

export interface StakerTotalStakedResponse {
  totalStaked: string;
  totalClaimedAmount: string;
  rewardsClaimed?: string;
  stakedFundsReclaimed?: string;
  weeklyEarnings: string;
  pools: StakedPoolItem[];
}

export interface UserRewardItem {
  poolAddress: string;
  pendingReward: string;
}

export interface UserRewardsResponse {
  totalPendingRewards: string;
  pools: UserRewardItem[];
  nextCursor: string | null;
}

export interface StakedPoolItem {
  poolAddress: string;
  poolName?: string;
  stakedAmount: string;
  status: string;
  apy?: PoolAPY;
}

export interface UserStakedPoolsResponse {
  pools: StakedPoolItem[];
  nextCursor: string | null;
}

export interface Pool {
  id: string;
  name: string;
  address: string;
  commission: number;
  hashPower: string;
  hashPowerNum: number;
  connectedMiners: number;
  blocksMinedCurrent: number;
  blocksMinedLast: number;
  rewardsGeneratedCurrent: number;
  rewardsGeneratedLast: number;
  totalStaked: number;
  isFeatured: boolean;
  uptime: number;
  status: "active" | "maintenance" | "offline";
}

export interface UserStake {
  poolId: string;
  poolName: string;
  stakedAmount: number;
  pendingRewards: number;
  totalRewardsEarned: number;
  stakedAt: Date;
  unbondingEnd?: Date;
  isUnbonding: boolean;
  rewardHistory: RewardHistoryEntry[];
}

export interface RewardHistoryEntry {
  epoch: number;
  amount: number;
  date: Date;
  apy: number;
}

export interface EpochInfo {
  currentEpoch: number;
  epochStartDate: Date;
  nextEpochDate: Date;
  weeklyDecayRate: number;
  rewardSplit: {
    miner: number;
    staker: number;
  };
  baseWeeklyRewardPool: number;
  currentWeeklyRewardPool: number;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  availableBdag: number;
  totalStaked: number;
  totalPendingRewards: number;
  totalRewardsEarned: number;
  rewardsThisWeek: number;
  stakes: UserStake[];
}

export interface NetworkStats {
  totalNetworkStaked: number;
  totalStakedUSD: number;
  currentAPY: number;
  targetAPYMin: number;
  targetAPYMax: number;
  totalStakers: number;
  marketCap: number;
  totalRewardsDistributed: number;
  bdagPrice: number;
  currentWeeklyRewardPool: number;
  weeklyDecayMultiplier: number;
}
