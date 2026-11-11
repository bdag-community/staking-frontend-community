import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, Plus, Minus } from "lucide-react";
import { formatBDAG } from "@/lib/utils";
import { StakeItemSkeleton } from "@/components/skeletons/StakingSkeletons";
import { StakedPoolItem, UserRewardItem } from "@/utils/interface";

import { SimpleTooltip } from "@/components/ui/tooltip";
import { useStakingPeriods } from "@/hooks/use-staking-periods";

interface StakedPoolsListProps {
  stakedPools: StakedPoolItem[];
  poolRewards: UserRewardItem[];
  isLoadingPools: boolean;
  onStakeMore: (poolAddress: string) => void;
  onUnstake: (poolAddress: string) => void;
}

export const StakedPoolsList: React.FC<StakedPoolsListProps> = ({
  stakedPools,
  poolRewards,
  isLoadingPools,
  onStakeMore,
  onUnstake,
}) => {
  const { formatted: stakingPeriodLabels } = useStakingPeriods();

  return (
    <Card className="glass-card border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl">Your Stakes</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoadingPools ? (
          <div className="flex flex-col gap-4">
            {[1, 2].map((i) => (
              <StakeItemSkeleton key={i} />
            ))}
          </div>
        ) : stakedPools.length > 0 ? (
          <div className="space-y-4">
            {stakedPools.map((stake) => {
              const rewards = poolRewards.find(
                (r) => r.poolAddress === stake.poolAddress,
              );
              return (
                <div
                  key={stake.poolAddress}
                  className="p-4 rounded-xl bg-secondary/30 border border-border/50"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">
                          {stake.poolName ||
                            `Pool ${stake.poolAddress.slice(0, 6)}...`}
                        </h3>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Staked</p>
                          <p className="font-medium">
                            {formatBDAG(Number(stake.stakedAmount))} BDAG
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">
                            Pending Rewards
                          </p>
                          <p className="font-medium text-success">
                            +{formatBDAG(Number(rewards?.pendingReward || 0))}{" "}
                            BDAG
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium capitalize">
                            {stake.status}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full lg:w-auto mt-2 lg:mt-0">
                      <Button
                        variant="glow"
                        size="sm"
                        onClick={() => onStakeMore(stake.poolAddress)}
                        className="gap-1 sm:gap-2 h-10 shadow-md active:scale-95 transition-transform"
                      >
                        <Plus className="w-4 h-4" />
                        Stake More
                      </Button>
                      <SimpleTooltip
                        content={`* After unstaking, amount will be available to withdraw after about ${stakingPeriodLabels.unbondingPlain}`}
                      >
                        <Button
                          variant="glow"
                          size="sm"
                          onClick={() => onUnstake(stake.poolAddress)}
                          className="w-full gap-1 sm:gap-2 h-10 shadow-md active:scale-95 transition-transform"
                        >
                          <Minus className="w-4 h-4" />
                          Unstake
                        </Button>
                      </SimpleTooltip>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Staked pools will be shown here once available.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
