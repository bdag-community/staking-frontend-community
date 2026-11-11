import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { formatEther } from "viem";
import {
  ArrowLeft,
  Cpu,
  Pickaxe,
  Gift,
  Users,
  Clock,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { StakeModal } from "@/components/ui/StakeModal";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { UnstakeConfirmationDialog } from "@/components/portfolio/UnstakeConfirmationDialog";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Pool } from "@/utils/interface";
import { cn, formatBDAG, formatNumber, formatCountdown } from "@/lib/utils";
import { STAKING_CONSTANTS } from "@/utils/constants";

import { Skeleton } from "@/components/ui/skeleton";
import {
  PoolHeaderSkeleton,
  SectionSkeleton,
} from "@/components/skeletons/StakingSkeletons";

import { useStakerInfo } from "@/hooks/use-staker-info";
import { usePoolAddresses } from "@/hooks/use-pool-addresses";
import { useWallet } from "@/hooks/use-wallet";
import { useStakingContract } from "@/hooks/use-staking-contract";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { useUnbondingRequests } from "@/hooks/use-unbonding-requests";
import { useChainTime } from "@/hooks/use-chain-time";
import { useInitialBondingPeriod } from "@/hooks/use-initial-bonding-period";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { ConfirmingOverlay } from "@/components/ui/confirming-overlay";
import { TransactionStatusNotice } from "@/components/ui/transaction-status-notice";
//miningPoolPag
const MiningPoolPage: React.FC = () => {
  const { poolId } = useParams<{ poolId: string }>();
  const { isConnected } = useWallet();
  const {
    claim: claimRewards,
    unstake,
    isPending,
    isConfirming,
    pendingAction,
    transactionStatus,
    applyNonceRepair,
    isRepairing,
  } = useStakingContract();
  const { globalStats } = useGlobalStats();

  const { stakerInfo: userStake } = useStakerInfo(poolId || null);
  const { pools } = usePoolAddresses();
  const { unbondingRequests, isLoading: isLoadingUnbonding } =
    useUnbondingRequests();
  const { chainTime, isLoading: isLoadingChainTime } = useChainTime();
  const { bondingEndsAt, isLoading: isLoadingBondingPeriod } =
    useInitialBondingPeriod();
  const { formatted: stakingPeriodLabels } = useStakingPeriods();

  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  const [showUnstakeDialog, setShowUnstakeDialog] = useState(false);
  const [unbondingCountdown, setUnbondingCountdown] = useState(0);
  const [activePoolAction, setActivePoolAction] = useState<
    "claim" | "withdraw" | null
  >(null);
  const now = chainTime ?? 0;
  const isInitialBondingActive =
    Boolean(bondingEndsAt) && now > 0 && now < Number(bondingEndsAt);

  const pool = useMemo<Pool | null>(() => {
    if (pools && pools.length > 0 && poolId) {
      const apiPool = pools.find((candidate) => candidate.poolAddress === poolId);
      if (apiPool) {
        return {
          id: apiPool.poolAddress,
          name: `Pool ${apiPool.poolAddress.slice(0, 6)}`,
          address: apiPool.poolAddress,
          commission: 2.5,
          hashPower: "N/A",
          hashPowerNum: 0,
          connectedMiners: apiPool.totalStakers || 0,
          blocksMinedCurrent: 0,
          blocksMinedLast: 0,
          rewardsGeneratedCurrent: 0,
          rewardsGeneratedLast: 0,
          totalStaked: Number(apiPool.totalStaked) || 0,
          isFeatured: false,
          uptime: 99.9,
          status: "active",
        };
      }
    }
    return null;
  }, [pools, poolId]);

  const poolUnbondingRequests = useMemo(() => {
    if (!poolId) return [];
    return unbondingRequests.filter(
      (request) =>
        !request.isClaimed &&
        request.pool.toLowerCase() === poolId.toLowerCase(),
    );
  }, [poolId, unbondingRequests]);

  const hasActiveUnbondingRequest = useMemo(
    () =>
      unbondingRequests.some(
        (request) =>
          !request.isClaimed && (!now || Number(request.releaseTime) > now),
      ),
    [unbondingRequests, now],
  );

  const activeUnbondingRequest = useMemo(
    () =>
      poolUnbondingRequests
        .filter((request) => Number(request.releaseTime) > now)
        .sort((a, b) => Number(a.releaseTime) - Number(b.releaseTime))[0],
    [poolUnbondingRequests, now],
  );

  const poolClaimableAmount = useMemo(() => {
    if (hasActiveUnbondingRequest || isInitialBondingActive) return 0n;

    return poolUnbondingRequests.reduce((total, request) => {
      if (Number(request.releaseTime) > now) return total;
      return total + BigInt(request.amount || 0);
    }, 0n);
  }, [
    poolUnbondingRequests,
    hasActiveUnbondingRequest,
    isInitialBondingActive,
    now,
  ]);

  const isPoolClaimable =
    poolClaimableAmount > 0n &&
    !hasActiveUnbondingRequest &&
    !isInitialBondingActive;

  useEffect(() => {
    if (!activeUnbondingRequest || !now) {
      setUnbondingCountdown(0);
      return;
    }

    setUnbondingCountdown(
      Math.max(0, Math.floor(Number(activeUnbondingRequest.releaseTime) - now)),
    );
  }, [activeUnbondingRequest, now]);

  const handleClaim = useCallback(async () => {
    if (poolId && isPoolClaimable) {
      setActivePoolAction("claim");
      try {
        await claimRewards(poolId);
      } catch (err) {
        console.error("Claim error:", err);
      } finally {
        setActivePoolAction(null);
      }
    }
  }, [poolId, claimRewards, isPoolClaimable]);

  const handleUnstake = useCallback(
    async (amount: string, isMax: boolean) => {
      if (poolId && userStake) {
        try {
          await unstake(poolId, amount, isMax);
          setShowUnstakeDialog(false);
        } catch (err) {
          console.error("Unstake error:", err);
        }
      }
    },
    [poolId, userStake, unstake],
  );

  const handleWithdraw = useCallback(async () => {
    if (poolId && isPoolClaimable) {
      setActivePoolAction("withdraw");
      try {
        await claimRewards(poolId);
      } catch (err) {
        console.error("Withdraw error:", err);
      } finally {
        setActivePoolAction(null);
      }
    }
  }, [poolId, claimRewards, isPoolClaimable]);

  if (!pool) {
    return (
      <div className="container py-8">
        <PoolHeaderSkeleton />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <SectionSkeleton />
            <SectionSkeleton />
          </div>
          <Skeleton className="h-96 w-full glass-card" />
        </div>
      </div>
    );
  }

  const isUnbonding = poolUnbondingRequests.length > 0;
  const isConfirmingPoolClaim =
    activePoolAction === "claim" && isConfirming && pendingAction === "claim";
  const isConfirmingPoolWithdraw =
    activePoolAction === "withdraw" &&
    isConfirming &&
    pendingAction === "claim";

  return (
    <>
      <ConfirmingOverlay active={isConfirming} />
      <div className="container py-8">
        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Pools
        </Link>
        <TransactionStatusNotice
          transaction={transactionStatus}
          onApplyRepair={applyNonceRepair}
          isApplyingRepair={isRepairing}
        />

        {/* Pool Header */}
        <div className="glass-card p-6 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-2xl md:text-3xl font-bold">
                  {pool.name}
                </h1>
                <span className="status-badge-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  Active
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="font-mono text-sm">{pool.address}</span>
                <CopyButton
                  value={pool.address}
                  className="p-1 hover:text-foreground transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-center px-4 py-2 rounded-lg bg-warning/10 border border-warning/20">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Commission
                </p>
                <p className="text-xl font-bold text-warning">
                  {pool.commission}%
                </p>
              </div>
              <div className="text-center px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-[10px] text-muted-foreground uppercase">
                  Uptime
                </p>
                <p className="text-xl font-bold text-primary">{pool.uptime}%</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Pool Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Stats */}
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">
                Pool Performance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="stat-card !p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Cpu className="w-4 h-4 text-primary" />
                    <span className="data-label">Hash Power</span>
                  </div>
                  <p className="data-value">{pool.hashPower}</p>
                </div>

                <div className="stat-card !p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="data-label">Miners</span>
                  </div>
                  <p className="data-value">
                    {formatNumber(pool.connectedMiners, 0)}
                  </p>
                </div>

                <div className="stat-card !p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Pickaxe className="w-4 h-4 text-primary" />
                    <span className="data-label">Blocks (Epoch)</span>
                  </div>
                  <p className="data-value">
                    {pool.blocksMinedCurrent}
                    <span className="text-sm text-muted-foreground ml-2">
                      (prev: {pool.blocksMinedLast})
                    </span>
                  </p>
                </div>

                <div className="stat-card !p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-success" />
                    <span className="data-label">Rewards (Epoch)</span>
                  </div>
                  <p className="data-value text-success">
                    {formatNumber(pool.rewardsGeneratedCurrent, 2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Staking Info */}
            <div className="glass-card p-6">
              <h2 className="font-display font-semibold text-lg mb-4">
                Staking Information
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="data-label">Total BDAG Delegated</span>
                  </div>
                  <p className="text-2xl font-bold">
                    {formatBDAG(pool.totalStaked)} BDAG
                  </p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="data-label">Estimated APY</span>
                    <InfoTooltip
                      content={`Dynamic APY: ${STAKING_CONSTANTS.TARGET_APY_MIN}-${STAKING_CONSTANTS.TARGET_APY_MAX}% target. Changes based on total network stake.`}
                    />
                  </div>
                  <p className="text-2xl font-bold text-success">
                    ~{formatNumber(globalStats?.weeklyApy, 2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* User Position Panel */}
          <div className="space-y-6">
            {/* User Position */}
            {isConnected && userStake ? (
              <div
                className={cn(
                  "glass-card p-6 border-primary/30 glow-primary-sm",
                  (isConfirmingPoolClaim || isConfirmingPoolWithdraw) &&
                    "tx-confirming-surface",
                )}
              >
                <h2 className="font-display font-semibold text-lg mb-4">
                  Your Position
                </h2>

                <div className="space-y-4 mb-6">
                  <div>
                    <p className="data-label mb-1">Staked Amount</p>
                    <p className="text-2xl font-bold">
                      {formatBDAG(userStake.stakedAmount)} BDAG
                    </p>
                  </div>

                  <div>
                    <p className="data-label mb-1">Pending Rewards</p>
                    <p className="text-2xl font-bold text-success">
                      +{formatBDAG(userStake.pendingReward)} BDAG
                    </p>
                  </div>

                  {isUnbonding && (
                    <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-sm font-medium text-warning">
                          Unbonding Active
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {unbondingCountdown > 0
                          ? `Time remaining: ${formatCountdown(
                              unbondingCountdown,
                            )}`
                          : "Ready to withdraw"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleClaim}
                    disabled={
                      !isPoolClaimable ||
                      isPending ||
                      isLoadingUnbonding ||
                      isLoadingChainTime ||
                      isLoadingBondingPeriod
                    }
                    className={cn(
                      "w-full btn-primary-glow text-primary-foreground font-medium",
                      isConfirmingPoolClaim && "btn-confirming",
                    )}
                  >
                    {isConfirmingPoolClaim ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      <>
                        <Gift className="w-4 h-4 mr-2" />
                        Claim Rewards
                        {isPoolClaimable &&
                          ` (${formatBDAG(formatEther(poolClaimableAmount))})`}
                      </>
                    )}
                  </Button>

                  {isUnbonding ? (
                    <Button
                      onClick={handleWithdraw}
                      disabled={
                        !isPoolClaimable ||
                        isPending ||
                        isLoadingChainTime ||
                        isLoadingBondingPeriod
                      }
                      variant="outline"
                      className={cn(
                        "w-full btn-secondary-outline",
                        isConfirmingPoolWithdraw && "btn-confirming",
                      )}
                    >
                      {isConfirmingPoolWithdraw ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          {!isPoolClaimable && unbondingCountdown > 0
                            ? "Unbonding..."
                            : "Withdraw"}
                        </>
                      )}
                    </Button>
                  ) : (
                    <SimpleTooltip
                      content={`* After unstaking, amount will be available to withdraw after about ${stakingPeriodLabels.unbondingPlain}`}
                    >
                      <span className="w-full inline-flex">
                        <Button
                          onClick={() => setShowUnstakeDialog(true)}
                          variant="outline"
                          className="w-full btn-secondary-outline"
                          disabled={
                            !userStake ||
                            Number(userStake.stakedAmount) <= 0 ||
                            isPending
                          }
                        >
                          Initiate Unstake
                        </Button>
                      </span>
                    </SimpleTooltip>
                  )}

                  <Button
                    onClick={() => setIsStakeModalOpen(true)}
                    variant="outline"
                    className="w-full btn-secondary-outline"
                  >
                    Stake More
                  </Button>
                </div>
              </div>
            ) : isConnected ? (
              <div className="glass-card p-6">
                <h2 className="font-display font-semibold text-lg mb-4">
                  Start Staking
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Delegate your BDAG to earn weekly rewards from block
                  emissions.
                </p>
                <Button
                  onClick={() => setIsStakeModalOpen(true)}
                  className="w-full btn-primary-glow text-primary-foreground font-medium"
                >
                  Stake on {pool.name}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <StakeModal
        pool={pool?.address}
        isOpen={isStakeModalOpen}
        onClose={() => setIsStakeModalOpen(false)}
      />

      <UnstakeConfirmationDialog
        isOpen={showUnstakeDialog}
        onClose={() => setShowUnstakeDialog(false)}
        onConfirm={handleUnstake}
        title="Confirm Unstake"
        description={`This will start a ${stakingPeriodLabels.unbondingHyphenated} unbonding period. You won't earn rewards during this time and your tokens will be locked.`}
        maxAvailable={
          Number(userStake?.stakedAmount || 0) +
          Number(userStake?.pendingReward || 0)
        }
        isPending={isPending}
        isConfirming={isConfirming && pendingAction === "unstake"}
      />
    </>
  );
};

export default MiningPoolPage;
