import { LegacyStakingLink } from "@/components/legacy/LegacyStakingLink";
import React, { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { formatEther, parseEther } from "viem";
import { useStakingContract } from "@/hooks/use-staking-contract";

import { StakeModal } from "@/components/ui/StakeModal";
import { useTotalStaked } from "@/hooks/use-total-staked";
import { useUserRewards } from "@/hooks/use-user-rewards";
import { useUserStakedPools } from "@/hooks/use-user-staked-pools";
import { useRecentHistory } from "@/hooks/use-recent-history";
import { useEpochStatus } from "@/hooks/use-epoch-status";
import { useUnbondingRequests } from "@/hooks/use-unbonding-requests";
import { useInitialBondingPeriod } from "@/hooks/use-initial-bonding-period";
import { useChainTime } from "@/hooks/use-chain-time";
import {
  getUnbondingPayoutAmount,
} from "@/utils/unbonding";

// Sub-components
import { PortfolioStats } from "@/components/portfolio/PortfolioStats";
import { RewardDistributionCard } from "@/components/portfolio/RewardDistributionCard";
// import { StakedPoolsList } from "@/components/portfolio/StakedPoolsList";
import { RecentActivityTable } from "@/components/portfolio/RecentActivityTable";
import { UnstakeConfirmationDialog } from "@/components/portfolio/UnstakeConfirmationDialog";
import { ClaimRewardsDialog } from "@/components/portfolio/ClaimRewardsDialog";
import { formatNumber, formatUtcDateTime } from "@/lib/utils";
import { ConfirmingOverlay } from "@/components/ui/confirming-overlay";
import { TransactionStatusNotice } from "@/components/ui/transaction-status-notice";
import { useWallet } from "@/hooks/use-wallet";
import useNetworkRequest from "@/hooks/use-api";
import { apiEndpoint } from "@/config/apiEndpoints";
import { swrFetcher, resilientSWRConfig } from "@/utils/swr-helpers";
import { PortfolioConnectPrompt } from "@/components/portfolio/PortfolioConnectPrompt";
import { StakingPageHero } from "@/components/layout/StakingPageHero";

const PortfolioPage: React.FC = () => {
  const { isConnected, address } = useWallet();
  const requestApi = useNetworkRequest();
  const { data: legacyState } = useSWR<{ activities?: unknown[]; repair?: { status?: string; amount?: string; strandedPrincipal?: string } | null }>(
    isConnected && address ? apiEndpoint.legacy(address) : null,
    (url) => swrFetcher(requestApi, url),
    { ...resilientSWRConfig, refreshInterval: 30000 },
  );
  const {
    unstakeAll,
    claim,
    isPending: isActionPending,
    isConfirming,
    pendingAction,
    transactionStatus,
    applyNonceRepair,
    isRepairing,
  } = useStakingContract({ checkNonceOnConnect: true });

  const {
    totalStaked,
    totalClaimedAmount,
    weeklyEarnings,
    error: totalStakedError,
    pools: totalStakedPools,
    isLoading: isLoadingTotal,
    isTakingLonger: isTotalTakingLonger,
  } = useTotalStaked();

  const {
    isLoading: isLoadingRewards,
    isTakingLonger: isRewardsTakingLonger,
    totalPendingRewards,
    poolRewards,
    error: rewardsError,
  } = useUserRewards();

  const { stakedPools } = useUserStakedPools();

  const { unbondingRequests, isLoading: isLoadingUnbonding, error: unbondingError } =
    useUnbondingRequests();

  const {
    history,
    isLoadingHistory,
    isInitialLoading: isHistoryInitialLoading,
    hasMore,
    loadMore,
    error: historyError,
  } = useRecentHistory();

  const { epoch, timeRemaining, loading: isEpochLoading, error: epochError, isAwaitingConfirmation } = useEpochStatus();
  const { bondingEndsAt } = useInitialBondingPeriod();
  const { chainTime, isLoading: isLoadingChainTime } = useChainTime();

  const now = chainTime ?? 0;
  const isInitialBondingActive =
    Boolean(bondingEndsAt) && now > 0 && now < Number(bondingEndsAt);

  const {
    claimableTooltip,
    totalClaimablePayout,
    totalPendingUnbonding,
    claimablePoolAddresses,
    hasPendingUnbonding,
    latestReleaseTime,
    isClaimLocked,
  } = useMemo(() => {
    let pendingPayoutBig = BigInt(0);
    let maturedPayoutBig = BigInt(0);
    let latestRelease = 0;
    const maturedPools = new Set<string>();
    let hasActiveUnbonding = false;

    unbondingRequests.forEach((req) => {
      if (req.isClaimed) return;

      const reqAmount = getUnbondingPayoutAmount(req);
      const reqReleaseTime = Number(req.releaseTime);

      if (reqReleaseTime > latestRelease) {
        latestRelease = reqReleaseTime;
      }

      if (!now || reqReleaseTime > now) {
        pendingPayoutBig += reqAmount;
        hasActiveUnbonding = true;
      } else {
        maturedPayoutBig += reqAmount;
        if (reqAmount > 0n) {
          maturedPools.add(req.pool);
        }
      }
    });

    const claimablePayoutBig =
      hasActiveUnbonding || isInitialBondingActive ? 0n : maturedPayoutBig;
    const blockedUnbondingBig = hasActiveUnbonding
      ? pendingPayoutBig + maturedPayoutBig
      : pendingPayoutBig;
    const claimablePools =
      hasActiveUnbonding || isInitialBondingActive
        ? new Set<string>()
        : maturedPools;

    const claimablePayoutFormatted = formatEther(claimablePayoutBig);
    const pendingUnbondingFormatted = formatEther(blockedUnbondingBig);
    const claimableTooltip =
      claimablePayoutBig > 0n
        ? `You have ${formatNumber(formatEther(claimablePayoutBig), 2)} BDAG unbonded and available to claim now.`
        : isInitialBondingActive && bondingEndsAt
          ? `Your initial bonding period ends on ${new Date(
              Number(bondingEndsAt) * 1000,
            ).toLocaleString()}.`
          : hasActiveUnbonding && latestRelease > 0
            ? `You have ${formatNumber(
                formatEther(blockedUnbondingBig),
                2,
              )} BDAG unbonding. Claims unlock when the latest unbonding period ends on ${formatUtcDateTime(
                latestRelease * 1000,
              )}.`
            : "";

    const hasPendingUnbonding = hasActiveUnbonding;
    const totalReadyAmount = Number(claimablePayoutFormatted);
    const isClaimLocked =
      totalReadyAmount <= 0 ||
      claimablePools.size === 0 ||
      hasActiveUnbonding ||
      isInitialBondingActive ||
      isLoadingChainTime ||
      isLoadingUnbonding;

    return {
      totalClaimablePayout: claimablePayoutFormatted,
      totalPendingUnbonding: pendingUnbondingFormatted,
      claimablePoolAddresses: Array.from(claimablePools),
      claimableTooltip,
      hasPendingUnbonding,
      latestReleaseTime: latestRelease || null,
      isClaimLocked,
    };
  }, [
    unbondingRequests,
    now,
    bondingEndsAt,
    isInitialBondingActive,
    isLoadingChainTime,
    isLoadingUnbonding,
  ]);

  const [selectedPoolAddress, setSelectedPoolAddress] = useState<string | null>(
    null,
  );
  const [isStakeModalOpen, setIsStakeModalOpen] = useState(false);
  // const [unstakePoolId, setUnstakePoolId] = useState<string | null>(null);
  const [showUnstakeAllDialog, setShowUnstakeAllDialog] = useState(false);
  const [showUnstakeStakeDialog, setShowUnstakeStakeDialog] = useState(false);
  const [showClaimAllDialog, setShowClaimAllDialog] = useState(false);

  const activeStakedPools = useMemo(() => {
    const sourcePools =
      stakedPools.length > 0
        ? stakedPools.map((pool) => ({
            poolAddress: pool.poolAddress,
            stakedAmount: pool.stakedAmount,
          }))
        : totalStakedPools.map((pool) => ({
            poolAddress: pool.poolAddress,
            stakedAmount: pool.amount,
          }));

    return sourcePools.filter((pool) => Number(pool.stakedAmount || 0) > 0);
  }, [stakedPools, totalStakedPools]);

  const totalStakedSupportingText = useMemo(() => {
    if (
      !bondingEndsAt ||
      Number(totalStaked || 0) <= 0 ||
      now >= bondingEndsAt
    ) {
      return undefined;
    }

    return `Initial bonding period ends at: ${formatUtcDateTime(
      Number(bondingEndsAt) * 1000,
    )}`;
  }, [bondingEndsAt, now, totalStaked]);

  const claimableUnstakedBdag = useMemo(() => {
    if (isInitialBondingActive) return "0";
    return totalClaimablePayout;
  }, [isInitialBondingActive, totalClaimablePayout]);

  const awaitingUnbondingAmount = useMemo(() => {
    if (!hasPendingUnbonding) return "0";
    return totalPendingUnbonding;
  }, [hasPendingUnbonding, totalPendingUnbonding]);

  const claimSupportingText = useMemo(() => {
    if (!hasPendingUnbonding || !latestReleaseTime) return undefined;
    if (!now || isLoadingChainTime) return "Unbonding release time loading...";

    return `Unbonding period ends ${formatUtcDateTime(
      Number(latestReleaseTime) * 1000,
    )}`;
  }, [hasPendingUnbonding, isLoadingChainTime, latestReleaseTime, now]);

  const hasLegacyState = Boolean(
    legacyState &&
      ((legacyState.activities?.length ?? 0) > 0 ||
        Boolean(legacyState.repair && legacyState.repair.status !== "not_needed")),
  );
  const hasDataServiceError = Boolean(
    isConnected && (totalStakedError || rewardsError || unbondingError || historyError),
  );

  // const handleStakeMore = useCallback((poolAddress: string) => {
  //   setSelectedPoolAddress(poolAddress);
  //   setIsStakeModalOpen(true);
  // }, []);

  const handleStakeGeneral = useCallback(() => {
    setSelectedPoolAddress(null);
    setIsStakeModalOpen(true);
  }, []);

  // const handleUnstake = useCallback((poolId: string) => {
  //   setUnstakePoolId(poolId);
  // }, []);

  // const confirmUnstake = useCallback(async () => {
  //   if (unstakePoolId) {
  //     const stake = stakedPools.find((p) => p.poolAddress === unstakePoolId);
  //     if (!stake) return;

  //     try {
  //       await unstake(unstakePoolId, stake.stakedAmount);
  //       setUnstakePoolId(null);
  //     } catch (err) {
  //       console.error("Unstaking error:", err);
  //     }
  //   }
  // }, [unstakePoolId, unstake, stakedPools]);

  const confirmUnstakeAll = useCallback(
    async (amount?: string, isMax?: boolean) => {
      const poolsWithRewards = poolRewards
        .filter((reward) => Number(reward.pendingReward || 0) > 0)
        .map((reward) => ({
          poolAddress: reward.poolAddress,
          stakedAmount: "0",
          rewardAmount: reward.pendingReward,
        }));

      try {
        await unstakeAll(poolsWithRewards, false, amount, "unstakeRewards");
      } catch (err) {
        console.error("Unstake all error:", err);
      } finally {
        setShowUnstakeAllDialog(false);
      }
    },
    [poolRewards, unstakeAll],
  );

  const confirmUnstakeStake = useCallback(
    async (amount: string, isMax: boolean) => {
      const poolsWithStake = activeStakedPools.map((pool) => {
        const reward = poolRewards.find(
          (r) => r.poolAddress.toLowerCase() === pool.poolAddress.toLowerCase(),
        );

        return {
          ...pool,
          rewardAmount: reward?.pendingReward || "0",
        };
      });

      if (poolsWithStake.length === 0) {
        setShowUnstakeStakeDialog(false);
        return;
      }

      try {
        const requestedStakeWei = parseEther(amount || "0");
        const totalStakedWei = parseEther(String(totalStaked || "0"));
        const shouldUnstakeMax =
          isMax ||
          (requestedStakeWei > 0n && requestedStakeWei >= totalStakedWei);
        let remainingStakeWei = requestedStakeWei;
        const contractAmountWei = poolsWithStake.reduce((total, pool) => {
          if (remainingStakeWei === 0n) return total;

          const poolStakeWei = parseEther(pool.stakedAmount || "0");
          const poolRewardWei = parseEther(pool.rewardAmount || "0");
          const stakeFromPoolWei =
            poolStakeWei < remainingStakeWei ? poolStakeWei : remainingStakeWei;

          remainingStakeWei -= stakeFromPoolWei;
          return total + poolRewardWei + stakeFromPoolWei;
        }, 0n);
        const contractAmount = shouldUnstakeMax
          ? undefined
          : formatEther(contractAmountWei);

        await unstakeAll(
          poolsWithStake,
          shouldUnstakeMax,
          contractAmount,
          "unstakeStake",
        );
      } catch (err) {
        console.error("Unstake stake error:", err);
      } finally {
        setShowUnstakeStakeDialog(false);
      }
    },
    [activeStakedPools, poolRewards, totalStaked, unstakeAll],
  );

  const handleClaimAllReward = useCallback(async () => {
    if (isClaimLocked || claimablePoolAddresses.length === 0) {
      setShowClaimAllDialog(false);
      return;
    }

    // claimStake settles all matured unbonding across pools in a single call.
    try {
      await claim(claimablePoolAddresses[0]);
    } catch (err) {
      console.error("Claim all error:", err);
    } finally {
      setShowClaimAllDialog(false);
    }
  }, [claimablePoolAddresses, claim, isClaimLocked]);

  if (!isConnected) {
    return <PortfolioConnectPrompt />;
  }

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
      <ConfirmingOverlay active={isConfirming} />
      <div className="page-shell">
        <StakingPageHero kind="portfolio" eyebrow="Your staking home" title="Portfolio" description="View and manage your staked BDAG and rewards across all pools." />
        <div className="mb-6"><LegacyStakingLink /></div>
        <TransactionStatusNotice
          transaction={transactionStatus}
          onApplyRepair={applyNonceRepair}
          isApplyingRepair={isRepairing}
        />
        {hasLegacyState && (
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-warning/30 bg-warning/[.06] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-warning">This wallet has pre-fork staking history.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Review old unbonding requests or any indexed stranded-principal repair before starting another exit.</p>
            </div>
            <Link to="/legacy" className="inline-flex min-h-10 items-center justify-center rounded-md border border-warning/40 px-4 text-sm font-medium text-warning hover:bg-warning/10">Review legacy positions</Link>
          </div>
        )}
        {hasDataServiceError && (
          <div role="status" className="mb-6 rounded-2xl border border-warning/30 bg-warning/[.06] p-4 text-sm text-warning">
            Some portfolio reads are unavailable. Balances are hidden until the API and contract reads succeed; your funds have not changed. Refresh to retry.
          </div>
        )}
        {!hasDataServiceError && <PortfolioStats
          isLoadingTotal={isLoadingTotal}
          totalStaked={totalStaked}
          totalStakedSupportingText={totalStakedSupportingText}
          isLoadingRewards={isLoadingRewards}
          totalPendingRewards={totalPendingRewards}
          totalClaimedAmount={totalClaimedAmount}
          totalClaimable={claimableUnstakedBdag}
          weeklyEarnings={weeklyEarnings}
          awaitingUnbondingAmount={awaitingUnbondingAmount}
          isLoadingUnbonding={isLoadingUnbonding || isLoadingChainTime}
          claimTooltip={claimableTooltip}
          claimSupportingText={claimSupportingText}
          isTakingLonger={isTotalTakingLonger || isRewardsTakingLonger}
        />}
        <RewardDistributionCard
          timeRemaining={timeRemaining}
          epoch={epoch}
          epochError={epochError}
          isAwaitingEpoch={isAwaitingConfirmation}
          totalStaked={totalStaked}
          totalPendingRewards={totalPendingRewards}
          isActionPending={isActionPending || hasDataServiceError}
          isConfirmingTx={isConfirming}
          pendingAction={pendingAction}
          isLoading={
            isLoadingTotal ||
            isLoadingRewards ||
            isLoadingUnbonding ||
            isEpochLoading
          }
          isClaimLocked={isClaimLocked}
          latestReleaseTime={latestReleaseTime}
          hasPendingUnbonding={hasPendingUnbonding}
          claimableAmount={totalClaimablePayout}
          onUnstakeAll={() => {
            setShowUnstakeAllDialog(true);
          }}
          onUnstakeStake={() => {
            setShowUnstakeStakeDialog(true);
          }}
          onClaimAll={() => setShowClaimAllDialog(true)}
          onStake={handleStakeGeneral}
        />

        {/* <StakedPoolsList
          stakedPools={stakedPools}
          poolRewards={poolRewards}
          isLoadingPools={isLoadingPools}
          onStakeMore={handleStakeMore}
          onUnstake={handleUnstake}
        /> */}

        {/* <UnbondingRequestsList
          unbondingRequests={unbondingRequests}
          stakedPools={stakedPools}
          isLoading={isLoadingUnbonding}
        /> */}

        <RecentActivityTable
          history={history}
          isLoadingHistory={isLoadingHistory}
          isInitialLoading={isHistoryInitialLoading}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>

      <StakeModal
        pool={selectedPoolAddress}
        isOpen={isStakeModalOpen}
        onClose={() => {
          setIsStakeModalOpen(false);
          setSelectedPoolAddress(null);
        }}
      />

      {/* <UnstakeConfirmationDialog
        isOpen={!!unstakePoolId}
        onClose={() => setUnstakePoolId(null)}
        onConfirm={confirmUnstake}
        title="Confirm Unstake"
        description="This will start an unbonding period. You won't earn rewards during this time and your tokens will be locked."
      /> */}

      <UnstakeConfirmationDialog
        isOpen={showUnstakeAllDialog}
        onClose={() => setShowUnstakeAllDialog(false)}
        onConfirm={confirmUnstakeAll}
        title="Confirm Reward Unstake"
        description="This will move your earned rewards into unbonding. You may need to confirm one transaction per reward pool."
        maxAvailable={totalPendingRewards || 0}
        isPending={isActionPending}
        isConfirming={isConfirming && pendingAction === "unstakeRewards"}
      />

      <UnstakeConfirmationDialog
        isOpen={showUnstakeStakeDialog}
        onClose={() => setShowUnstakeStakeDialog(false)}
        onConfirm={confirmUnstakeStake}
        title="Confirm Stake Unstake"
        description="This will move your staked BDAG into unbonding. Pending rewards in those pools are included first by the staking contract, so the unbonding amount may be higher than the stake amount entered."
        maxAvailable={totalStaked || 0}
        isPending={isActionPending}
        isConfirming={isConfirming && pendingAction === "unstakeStake"}
      />

      <ClaimRewardsDialog
        isOpen={showClaimAllDialog}
        onClose={() => setShowClaimAllDialog(false)}
        onConfirm={handleClaimAllReward}
        totalClaimable={totalClaimablePayout}
        isDisabled={isClaimLocked}
        isPending={isActionPending}
        isConfirming={isConfirming && pendingAction === "claim"}
      />

    </div>
  );
};

export default PortfolioPage;
