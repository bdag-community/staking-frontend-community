import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
    BadgeCheck,
    CalendarClock,
    Coins,
    Hourglass,
    Info,
    Loader2,
    LockOpen,
    LucideIcon,
    RotateCcw,
    TrendingUp,
    Wallet,
} from "lucide-react";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { formatNumber, formatCompactNumber } from "@/lib/utils";
import { StatCardSkeleton } from "@/components/skeletons/StakingSkeletons";
import {ENV} from "@/config/env";

interface StatItemProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    iconColorClass: string;
    isLoading: boolean;
    tooltipContent?: string;
    infoTooltip?: string;
    supportingText?: string;
    supportingClassName?: string;
    valueColorClass?: string;
    borderClass?: string;
}

const StatItem: React.FC<StatItemProps> = ({
    label,
    value,
    icon: Icon,
    iconColorClass,
    isLoading,
    tooltipContent,
    infoTooltip,
    supportingText,
    supportingClassName = "text-muted-foreground",
    valueColorClass = "",
    borderClass = "border-none",
}) => {
    if (isLoading) return <StatCardSkeleton />;

    return (
        <Card className={`glass-card ${borderClass}`}>
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconColorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-md text-primary">{label}</p>
                            {infoTooltip && (
                                <SimpleTooltip content={infoTooltip}>
                                    <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help" />
                                </SimpleTooltip>
                            )}
                        </div>
                        <div className={`flex items-baseline gap-1 text-2xl font-bold leading-none ${valueColorClass}`}>
                            <SimpleTooltip content={tooltipContent || `${formatNumber(value, 2)} BDAG`}>
                                <span className="cursor-help border-b border-dotted border-muted-foreground/50 leading-none">
                                    {formatCompactNumber(value)}
                                </span>
                            </SimpleTooltip>
                            <span className="text-xl font-semibold leading-none text-muted-foreground">BDAG</span>
                        </div>
                        
                        {supportingText && (
                            <span className={`mt-1 block text-[11px] leading-snug ${supportingClassName}`}>
                                {supportingText}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const SubStatItem: React.FC<StatItemProps> = ({
    label,
    value,
    icon: Icon,
    iconColorClass,
    isLoading,
    tooltipContent,
    infoTooltip,
    supportingText,
    supportingClassName = "text-muted-foreground",
    valueColorClass = "",
}) => {
    if (isLoading) return <StatCardSkeleton />;

    return (
        <Card className="border-none">
            <CardContent className="p-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconColorClass}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 mb-0.5">
                            <p className="text-xs text-muted-foreground">{label}</p>
                   
                        </div>
                        <div className={`flex items-baseline gap-1 text-md font-medium leading-none ${valueColorClass}`}>
                            <span className="cursor-help border-b border-dotted border-muted-foreground/50 leading-none">
                                {formatCompactNumber(value)}
                            </span>
                            <span className="text-xs font-medium leading-none text-muted-foreground">BDAG</span>
                        </div>
                        {supportingText && (
                            <span className={`mt-1 block text-[11px] leading-snug ${supportingClassName}`}>
                                {supportingText}
                            </span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

interface PortfolioStatsProps {
    isLoadingTotal: boolean;
    totalStaked: string | number;
    totalStakedSupportingText?: string;
    isLoadingRewards: boolean;
    totalPendingRewards: string | number;
    totalClaimedAmount: string | number;
    totalClaimable: string | number;
    weeklyEarnings: string | number;
    awaitingUnbondingAmount: string | number;
    isLoadingUnbonding: boolean;
    claimTooltip?: string;
    claimSupportingText?: string;
    isTakingLonger?: boolean;
}

export const PortfolioStats: React.FC<PortfolioStatsProps> = ({
    isLoadingTotal,
    totalStaked,
    totalStakedSupportingText,
    isLoadingRewards,
    totalPendingRewards,
    totalClaimedAmount,
    totalClaimable,
    weeklyEarnings,
    awaitingUnbondingAmount,
    isLoadingUnbonding,
    claimTooltip,
    claimSupportingText,
    isTakingLonger = false,
}) => {
    return (
        <div className="mb-8">
            {isTakingLonger && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>This is taking a little longer than usual. Please bear with us.</span>
                </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-1 border-primary/20 rounded-md mb-4  ">
            <div className="flex flex-col justify-evenly border-2 border-primary/20 rounded-md  bg-primary/5">
                
                <StatItem
                    label="Total Staked"
                    value={totalStaked}
                    icon={Coins}
                    iconColorClass="bg-primary/10 text-primary"
                    isLoading={isLoadingTotal}
                    infoTooltip="The total amount of BDAG you have currently staked."
                    valueColorClass=""
                    supportingText={totalStakedSupportingText}
                    supportingClassName="text-warning"
                />
                                <SubStatItem
                    label="Estimated Weekly Earnings"
                    value={weeklyEarnings}
                    icon={CalendarClock}
                    iconColorClass="bg-primary/10 text-primary"
                    valueColorClass="text-warning"
                    isLoading={isLoadingTotal}
                    infoTooltip="Estimated rewards for the current stake over one normal weekly epoch."
                />
                </div>
            <div className="flex flex-col justify-evenly border-2  border-primary/20 rounded-md  bg-primary/5">
                

                <StatItem
                    label="Rewards earned"
                    value={totalPendingRewards}
                    icon={TrendingUp}
                    iconColorClass="bg-success/10 text-primary"
                    isLoading={isLoadingRewards}
                    valueColorClass=""
                    infoTooltip="The rewards you have earned so far which may be unstaked to begin their unbonding period ."
                />
                <SubStatItem      
                    label="Unstaked BDAG Awaiting Unbonding"
                    value={awaitingUnbondingAmount}
                    icon={Hourglass}
                    iconColorClass="bg-warning/10 text-primary"
                    isLoading={isLoadingRewards || isLoadingUnbonding}
                    infoTooltip="Unstaked BDAG currently locked until the unbonding period completes. This uses the contract request amount."
                    valueColorClass="text-warning"
                             supportingText={claimSupportingText}
                    supportingClassName="text-warning"
                />
                </div>
                <div className="flex flex-col justify-evenly border-2 border-primary/20 rounded-md  bg-primary/5">
                <StatItem
                    label="Claimable Unstaked BDAG"
                    value={totalClaimable}
                    icon={LockOpen}
                    iconColorClass="bg-warning/10 text-primary"
                    isLoading={isLoadingUnbonding}
                    infoTooltip={claimTooltip || "The total amount of unbonded BDAG available to be claimed."}
           
                />
                                                <SubStatItem
                    label={ENV.LEGACY_ONLY ? "Total Payout Claimed" : "Total withdrawal payouts"}
                    value={totalClaimedAmount}
                    icon={Wallet}
                    iconColorClass="bg-secondary text-primary"
                    isLoading={isLoadingTotal}
                    infoTooltip="All BDAG received through confirmed withdrawal claims. Pooled withdrawals may include principal and rewards."
                />
                

                </div>
                <div className="flex items-center rounded-md border-2 border-primary/20 bg-primary/5 p-5"><p className="text-sm leading-6 text-muted-foreground">Withdrawal payouts may contain principal and rewards. The pooled contract records the combined payout, not a reliable split between the two. Pending exits are shown separately above.</p></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-1 border-primary/20 rounded-md mb-4">


            </div>
        </div>
    );
};
