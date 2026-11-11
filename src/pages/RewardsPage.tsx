import React, { useState, useCallback, useEffect, useMemo } from "react";
import { formatEther } from "viem";
import { useStakingContract } from "@/hooks/use-staking-contract";
import { useEpochStatus } from "@/hooks/use-epoch-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Gift, Clock, Coins, Loader2, Minus } from "lucide-react";
import { cn, formatBDAG } from "@/lib/utils";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { ConnectWalletGate } from "@/components/ui/ConnectWalletGate";
import { useUserRewards } from "@/hooks/use-user-rewards";
import { useUserStakedPools } from "@/hooks/use-user-staked-pools";
import { useUnbondingRequests } from "@/hooks/use-unbonding-requests";
import { useWallet } from "@/hooks/use-wallet";
import { useChainTime } from "@/hooks/use-chain-time";
import { useInitialBondingPeriod } from "@/hooks/use-initial-bonding-period";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { getUnbondingPayoutAmount } from "@/utils/unbonding";
import {
  RewardStatSkeleton,
  RewardItemSkeleton,
} from "@/components/skeletons/StakingSkeletons";
import { ConfirmingOverlay } from "@/components/ui/confirming-overlay";
import { TransactionStatusNotice } from "@/components/ui/transaction-status-notice";
import { EpochCountdown } from "@/components/portfolio/EpochCountdown";

const RewardsPage: React.FC = () => {
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
  const { epoch, timeRemaining: nextEpochCountdown, loading: isEpochLoading, error: epochError, isAwaitingConfirmation } = useEpochStatus();

  const {
    formattedTotalPending,
    poolRewards,
    isLoading: isLoadingRewards,
  } = useUserRewards();
  const { stakedPools, isLoading: isLoadingPools } = useUserStakedPools();
  const { unbondingRequests, isLoading: isLoadingUnbonding } =
    useUnbondingRequests();
  const { chainTime, isLoading: isLoadingChainTime } = useChainTime();
  const { bondingEndsAt, isLoading: isLoadingBondingPeriod } =
    useInitialBondingPeriod();
  const { formatted: stakingPeriodLabels } = useStakingPeriods();

  const [isClaimingAll, setIsClaimingAll] = useState(false);
  const [claimingPoolId, setClaimingPoolId] = useState<string | null>(null);
  const [unstakingPoolId, setUnstakingPoolId] = useState<string | null>(null);
  const [showClaimAllDialog, setShowClaimAllDialog] = useState(false);
  const [showClaimSingleDialog, setShowClaimSingleDialog] = useState<{
    poolId: string;
    poolName: string;
    amount: string;
  } | null>(null);
  const now = chainTime ?? 0;
  const isInitialBondingActive =
    Boolean(bondingEndsAt) && now > 0 && now < Number(bondingEndsAt);
  const isConfirmingClaim = isConfirming && pendingAction === "claim";
  const isConfirmingUnstake = isConfirming && pendingAction === "unstake";

  const {
    claimableByPool,
    claimablePoolAddresses,
    totalClaimable,
    hasActiveUnbonding,
  } = useMemo(() => {
    const byPool = new Map<string, { address: string; amount: bigint }>();
    let total = 0n;
    let hasPendingRequest = false;

    unbondingRequests.forEach((request) => {
      if (request.isClaimed) return;

      if (!now || Number(request.releaseTime) > now) {
        hasPendingRequest = true;
        return;
      }

      const amount = getUnbondingPayoutAmount(request);
      if (amount <= 0n) return;

      const address = request.pool;
      const key = address.toLowerCase();
      const current = byPool.get(key)?.amount ?? 0n;
      byPool.set(key, { address, amount: current + amount });
      total += amount;
    });

    if (hasPendingRequest || isInitialBondingActive) {
      byPool.clear();
      total = 0n;
    }

    return {
      claimableByPool: byPool,
      claimablePoolAddresses: Array.from(byPool.values()).map(
        (item) => item.address,
      ),
      totalClaimable: formatEther(total),
      hasActiveUnbonding: hasPendingRequest,
    };
  }, [unbondingRequests, now, isInitialBondingActive]);

  const isClaimDisabled =
    Number(totalClaimable) <= 0 ||
    hasActiveUnbonding ||
    isInitialBondingActive ||
    isPending ||
    isLoadingChainTime ||
    isLoadingBondingPeriod ||
    isLoadingUnbonding;

  const claimAllRewards = useCallback(async () => {
    if (claimablePoolAddresses.length === 0) return;

    // claimStake processes all matured unbonding requests for the staker in one
    // transaction; poolAddress only scopes operator auto-stake payouts.
    try {
      await claimRewards(claimablePoolAddresses[0]);
    } catch (err) {
      console.error("Failed to claim available rewards", err);
    }
  }, [claimablePoolAddresses, claimRewards]);

  const handleClaimAll = useCallback(async () => {
    setShowClaimAllDialog(false);
    setIsClaimingAll(true);

    try {
      await claimAllRewards();
    } catch (err) {
      console.error("Claim all error:", err);
    } finally {
      setIsClaimingAll(false);
    }
  }, [claimAllRewards]);

  const handleClaimSingle = useCallback(
    async (poolId: string, _poolName: string, _amount: string) => {
      if ((claimableByPool.get(poolId.toLowerCase())?.amount ?? 0n) <= 0n) {
        return;
      }

      setShowClaimSingleDialog(null);
      setClaimingPoolId(poolId);

      try {
        await claimRewards(poolId);
      } catch (err) {
        console.error("Claim single error:", err);
      } finally {
        setClaimingPoolId(null);
      }
    },
    [claimRewards, claimableByPool],
  );

  const handleUnstake = useCallback(
    async (poolId: string, amount: string) => {
      setUnstakingPoolId(poolId);
      try {
        await unstake(poolId, amount);
      } catch (err) {
        console.error("Unstake error:", err);
      } finally {
        setUnstakingPoolId(null);
      }
    },
    [unstake],
  );

  if (!isConnected) {
    return (
      <ConnectWalletGate description="Connect your wallet to view and claim your staking rewards" />
    );
  }

  return (
    <>
      <ConfirmingOverlay active={isConfirming} />
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
            Rewards
          </h1>
          <p className="text-muted-foreground">
            Track and claim your staking rewards
          </p>
        </div>
        <TransactionStatusNotice
          transaction={transactionStatus}
          onApplyRepair={applyNonceRepair}
          isApplyingRepair={isRepairing}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {isLoadingRewards ? (
            <RewardStatSkeleton />
          ) : (
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-success/10">
                    <Gift className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Pending Rewards
                    </p>
                    <p className="text-2xl font-bold text-success">
                      {formattedTotalPending} BDAG
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {isLoadingPools ? (
            <RewardStatSkeleton />
          ) : (
            <Card className="glass-card border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Currently Staked
                    </p>
                    <p className="text-2xl font-bold">
                      {stakedPools.length} Pools
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <Card
          className={cn(
            "glass-card border-primary/20 mb-8",
            isClaimingAll && isConfirmingClaim && "tx-confirming-surface",
          )}
        >
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Clock className="w-6 h-6 text-primary" />
                </div>
                <EpochCountdown epoch={epoch} timeRemaining={nextEpochCountdown} isLoading={isEpochLoading} error={epochError} isAwaitingConfirmation={isAwaitingConfirmation} />
              </div>
              {Number(totalClaimable) > 0 && (
                <Button
                  onClick={() => setShowClaimAllDialog(true)}
                  variant="glow"
                  size="lg"
                  className={cn(
                    "w-full md:w-auto gap-2 h-12 md:h-11 shadow-lg active:scale-95 transition-transform",
                    isClaimingAll && isConfirmingClaim && "btn-confirming",
                  )}
                  disabled={isClaimingAll || isClaimDisabled}
                >
                  {isClaimingAll ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {isConfirmingClaim ? "Confirming..." : "Claiming..."}
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      Claim Available BDAG ({formatBDAG(totalClaimable)})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rewards by Pool */}
        <Card
          className={cn(
            "glass-card border-primary/20",
            unstakingPoolId && isConfirmingUnstake && "tx-confirming-surface",
          )}
        >
          <CardHeader>
            <CardTitle className="text-xl">Rewards by Pool</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPools ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <RewardItemSkeleton key={i} />
                ))}
              </div>
            ) : stakedPools.length > 0 ? (
              <div className="space-y-4">
                {stakedPools.map((stake) => {
                  const rewards = poolRewards.find(
                    (r) => r.poolAddress === stake.poolAddress,
                  );
                  const claimableAmount =
                    claimableByPool.get(stake.poolAddress.toLowerCase())
                      ?.amount ?? 0n;
                  return (
                    <div
                      key={stake.poolAddress}
                      className="p-4 rounded-xl bg-secondary/30 border border-border/50"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-2">
                            {stake.poolName || `${stake.poolAddress}`}
                          </h3>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Staked</p>
                              <p className="font-medium">
                                {formatBDAG(Number(stake.stakedAmount))} BDAG
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Pending</p>
                              <p className="font-medium text-success">
                                +
                                {formatBDAG(
                                  Number(rewards?.pendingReward || 0),
                                )}{" "}
                                BDAG
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:flex sm:items-center gap-3 w-full md:w-auto">
                          <SimpleTooltip
                            content={`* After unstaking, amount will be available to withdraw after about ${stakingPeriodLabels.unbondingPlain}`}
                          >
                            <Button
                              onClick={() =>
                                handleUnstake(
                                  stake.poolAddress,
                                  stake.stakedAmount,
                                )
                              }
                              variant="glow"
                              size="sm"
                              className={cn(
                                "w-full sm:min-w-[100px] gap-2 h-10 shadow-md active:scale-95 transition-transform",
                                unstakingPoolId === stake.poolAddress &&
                                  isConfirmingUnstake &&
                                  "btn-confirming",
                              )}
                              disabled={
                                isPending || Number(stake.stakedAmount) <= 0
                              }
                            >
                              {unstakingPoolId === stake.poolAddress &&
                              isConfirmingUnstake ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Confirming...
                                </>
                              ) : (
                                <>
                                  <Minus className="w-4 h-4" />
                                  Unstake
                                </>
                              )}
                            </Button>
                          </SimpleTooltip>
                          <Button
                            onClick={() =>
                              setShowClaimSingleDialog({
                                poolId: stake.poolAddress,
                                poolName: stake.poolName || "Pool",
                                amount: totalClaimable,
                              })
                            }
                            variant="glow"
                            size="sm"
                            disabled={
                              claimableAmount <= 0n ||
                              claimingPoolId === stake.poolAddress ||
                              isClaimDisabled
                            }
                            className="w-full sm:min-w-[100px] gap-2 h-10 shadow-md active:scale-95 transition-transform"
                          >
                            {claimingPoolId === stake.poolAddress ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span className="hidden xs:inline">
                                  {isConfirming && pendingAction === "claim"
                                    ? "Confirming"
                                    : "Claiming"}
                                </span>
                              </>
                            ) : (
                              <>
                                <Gift className="w-3.5 h-3.5" />
                                Claim
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Start staking to earn rewards
                </p>
                <Button variant="glow" asChild>
                  <a href="/stake">Start Staking</a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={showClaimAllDialog}
        onOpenChange={setShowClaimAllDialog}
      >
        <AlertDialogContent className="overflow-hidden glass-card border-primary/20">
          <ConfirmingOverlay
            active={isConfirming && pendingAction === "claim"}
            contained
          />
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-success" />
              Claim Available BDAG
            </AlertDialogTitle>
            <AlertDialogDescription asChild><div className="space-y-3">
              <p>
                Claim all released withdrawal requests, including principal and
                rewards together. Your remaining stake stays invested.
              </p>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-lg font-bold text-success text-center">
                  {formatBDAG(totalClaimable)} BDAG
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Will be added to your wallet balance
                </p>
              </div>
            </div></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClaimAll}
              disabled={isClaimDisabled}
              className={cn(
                "bg-success hover:bg-success/90 text-success-foreground",
                isConfirming && pendingAction === "claim" && "btn-confirming",
              )}
            >
              {isConfirming && pendingAction === "claim" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Claim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!showClaimSingleDialog}
        onOpenChange={(open) => !open && setShowClaimSingleDialog(null)}
      >
        <AlertDialogContent className="overflow-hidden glass-card border-primary/20">
          <ConfirmingOverlay
            active={isConfirming && pendingAction === "claim"}
            contained
          />
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-success" />
              Claim Available BDAG
            </AlertDialogTitle>
            <AlertDialogDescription asChild><div className="space-y-3">
              <p>
                This settles all your released withdrawal requests across pools,
                including principal and rewards. Your remaining stake stays invested.
              </p>
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <p className="text-lg font-bold text-success text-center">
                  {formatBDAG(showClaimSingleDialog?.amount || "0")} BDAG
                </p>
                <p className="text-xs text-center text-muted-foreground mt-1">
                  Will be added to your wallet balance
                </p>
              </div>
            </div></AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                showClaimSingleDialog &&
                handleClaimSingle(
                  showClaimSingleDialog.poolId,
                  showClaimSingleDialog.poolName,
                  showClaimSingleDialog.amount,
                )
              }
              disabled={
                isClaimDisabled ||
                isPending ||
                !showClaimSingleDialog ||
                (claimableByPool.get(showClaimSingleDialog.poolId.toLowerCase())
                  ?.amount ?? 0n) <= 0n
              }
              className={cn(
                "bg-success hover:bg-success/90 text-success-foreground",
                isConfirming && pendingAction === "claim" && "btn-confirming",
              )}
            >
              {isConfirming && pendingAction === "claim" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Claim"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RewardsPage;
