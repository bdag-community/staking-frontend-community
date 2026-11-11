import React from "react";
import { parseEther } from "viem";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Gift, Loader2, Lock, MinusCircle, Wallet } from "lucide-react";
import type { StakingAction } from "@/hooks/use-staking-contract";
import {
  cn,
  formatUtcDateTime,
} from "@/lib/utils";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { EpochCountdown } from "./EpochCountdown";

const MIN_DISPLAYED_REWARD_WEI = parseEther("0.005");

const parseBdagToWei = (value: string | number) => {
  try {
    const normalized = String(value).replace(/,/g, "").trim();
    if (!normalized) return 0n;
    return parseEther(normalized);
  } catch {
    return 0n;
  }
};

interface RewardDistributionCardProps {
  timeRemaining: number;
  epoch: number;
  epochError?: string | null;
  isAwaitingEpoch?: boolean;
  totalStaked: string | number;
  totalPendingRewards: number | string;
  isActionPending: boolean;
  isConfirmingTx?: boolean;
  pendingAction?: StakingAction | null;
  isLoading?: boolean;
  isClaimLocked: boolean;
  latestReleaseTime: number | null;
  hasPendingUnbonding: boolean;
  claimableAmount: string | number;
  onUnstakeAll: () => void;
  onUnstakeStake: () => void;
  onClaimAll: () => void;
  onStake: () => void;
}

export const RewardDistributionCard: React.FC<RewardDistributionCardProps> = ({
  timeRemaining,
  epoch,
  epochError = null,
  isAwaitingEpoch = false,
  totalStaked,
  totalPendingRewards,
  isActionPending,
  isConfirmingTx = false,
  pendingAction = null,
  isLoading = false,
  isClaimLocked,
  latestReleaseTime,
  hasPendingUnbonding,
  claimableAmount,
  onUnstakeAll,
  onUnstakeStake,
  onClaimAll,
  onStake,
}) => {
  const hasDisplayablePendingRewards =
    parseBdagToWei(totalPendingRewards) >= MIN_DISPLAYED_REWARD_WEI;
  const isUnstakeRewardsDisabled = !hasDisplayablePendingRewards;
  const isUnstakeStakeDisabled = Number(totalStaked) <= 0;
  const isConfirmingUnstakeRewards =
    isConfirmingTx && pendingAction === "unstakeRewards";
  const isConfirmingUnstakeStake =
    isConfirmingTx && pendingAction === "unstakeStake";
  const isConfirmingClaim = isConfirmingTx && pendingAction === "claim";
  const hasConfirmingPageAction =
    isConfirmingUnstakeRewards ||
    isConfirmingUnstakeStake ||
    isConfirmingClaim;
  const confirmingButtonClass = "btn-confirming";

  return (
    <Card
      className={cn(
        "glass-card border-primary/20 mb-8",
        hasConfirmingPageAction && "tx-confirming-surface",
      )}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 md:flex-1">
            <div className="p-3 rounded-xl bg-primary/10">
              <Clock className="w-6 h-6 text-primary" />
            </div>
            <EpochCountdown epoch={epoch} timeRemaining={timeRemaining} isLoading={isLoading} error={epochError} isAwaitingConfirmation={isAwaitingEpoch} />
          </div>
          <div className="flex flex-col items-stretch gap-3 md:gap-8 w-full md:w-1/2">
              {isLoading ? (
                <div className="flex flex-col gap-2 w-full">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 w-full">
                <>
                  <Skeleton className="h-10 sm:h-11 w-full rounded-md" />
                  <Skeleton className="h-10 sm:h-11 w-full rounded-md" />
                      <Skeleton className="h-10 sm:h-11 w-full rounded-md col-span-2 md:col-auto" />
                </>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:gap-8 w-full">
                    <Skeleton className="h-10 sm:h-11 w-full rounded-md" />
                    <Skeleton className="h-10 sm:h-11 w-full rounded-md" />
                  </div>
                </div>
              ) : (
                <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-8 w-full">
                <SimpleTooltip
                    content={
                      isActionPending
                        ? null
                        : "Stake your BDAG to begin earning rewards, or to add to your stake and increase your earrnings"
                    }
                  >
                  <Button
                    onClick={onStake}
                    variant="glow"
                    size="default"
                    className="portfolio-action-button w-full gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase h-10 sm:h-11 shadow-md active:scale-95 transition-transform"
                    disabled={isActionPending}
                  >
                    Stake
                  </Button>
                  </SimpleTooltip>
                  <SimpleTooltip
                    content={
                      isUnstakeRewardsDisabled
                        ? "You have no earned rewards to unstake."
                        : "Unstake your earned rewards to begin the unbonding process."
                    }
                  >
                    <div className="w-full">
                      <Button
                        onClick={onUnstakeAll}
                        variant="glow"
                        size="default"
                        className={cn(
                          "portfolio-action-button gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase h-10 sm:h-11 shadow-md active:scale-95 transition-transform w-full",
                          isConfirmingUnstakeRewards && confirmingButtonClass,
                        )}
                        disabled={isActionPending || isUnstakeRewardsDisabled}
                      >
                        {isConfirmingUnstakeRewards ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          "Unstake Rewards"
                        )}
                      </Button>
                    </div>
                  </SimpleTooltip>
 
                  <SimpleTooltip
                    content={
                      isActionPending
                        ? null
                        : hasPendingUnbonding && latestReleaseTime
                          ? `Your funds are being unbonded and will be claimable on ${formatUtcDateTime(
                            Number(latestReleaseTime) * 1000,
                          )}.`
                          : isClaimLocked
                            ? Number(totalStaked) > 0 ||
                              hasDisplayablePendingRewards
                              ? "To claim funds, you must first unstake rewards or stake and wait for unbonding."
                              : "You do not have any BDAG staked yet. Start staking to earn rewards."
                            : "You have unbonded funds ready to claim."
                    }
                  >
                    <div className="col-span-2 md:col-auto w-full">
     
                      <Button
                        onClick={onClaimAll}
                        variant="glow"
                        size="default"
                        className={cn(
                          "portfolio-action-button w-full gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase h-10 sm:h-11 shadow-md active:scale-95 transition-transform",
                          isConfirmingClaim && confirmingButtonClass,
                        )}
                        disabled={isActionPending || isClaimLocked}
                      >
                        {isClaimLocked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : isConfirmingClaim ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Gift className="w-3.5 h-3.5" />
                        )}
                        {isConfirmingClaim ? "Confirming..." : "Claim Released BDAG"}{" "}
             
                      </Button>
                    </div>
                  </SimpleTooltip>
                </div>
                <div className="grid grid-cols-1 gap-3 md:gap-8 w-full">
                    <SimpleTooltip
                      content={
                        isUnstakeStakeDisabled
                          ? "You have no staked BDAG to unstake."
                          : "Unstake your staked BDAG to begin the unbonding process."
                      }
                    >
                      <div className="w-full">
                        <Button
                          onClick={onUnstakeStake}
                          variant="glow"
                          size="default"
                          className={cn(
                            "portfolio-action-button gap-1 sm:gap-2 text-xs sm:text-sm font-bold uppercase h-10 sm:h-11 shadow-md active:scale-95 transition-transform w-full",
                            isConfirmingUnstakeStake && confirmingButtonClass,
                          )}
                          disabled={isActionPending || isUnstakeStakeDisabled}
                        >
                          {isConfirmingUnstakeStake ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              Confirming...
                            </>
                          ) : (
                            <>
                              <MinusCircle className="w-3.5 h-3.5" />
                              Unstake My Stake
                            </>
                          )}
                        </Button>
                      </div>
                    </SimpleTooltip>

                  </div>
                </>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
