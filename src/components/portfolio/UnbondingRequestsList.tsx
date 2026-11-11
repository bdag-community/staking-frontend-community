import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, Lock } from "lucide-react";
import { formatNumber, formatUtcDateTime, truncatedHash } from "@/lib/utils";
import { formatEther } from "viem";
import { UnbondingRequest } from "@/hooks/use-unbonding-requests";
import { StakedPoolItem } from "@/utils/interface";
import { UnbondingItemSkeleton } from "@/components/skeletons/StakingSkeletons";
import { useChainTime } from "@/hooks/use-chain-time";

interface UnbondingRequestsListProps {
    unbondingRequests: UnbondingRequest[];
    stakedPools: StakedPoolItem[];
    isLoading?: boolean;
}

export const UnbondingRequestsList: React.FC<UnbondingRequestsListProps> = ({
    unbondingRequests,
    stakedPools,
    isLoading,
}) => {
    const { chainTime } = useChainTime();
    const activeRequests = unbondingRequests.filter((req) => !req.isClaimed);

    if (activeRequests.length === 0 && !isLoading) return null;

    return (
        <Card className="glass-card border-primary/20 mt-8 mb-8">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Unstake Requests
                </CardTitle>
                {!isLoading && (
                    <span className="px-2 py-1 rounded-md bg-primary/10 text-[10px] font-medium text-primary uppercase tracking-wider">
                        {activeRequests.length} Pending
                    </span>
                )}
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {isLoading ? (
                        <>
                            <UnbondingItemSkeleton />
                            <UnbondingItemSkeleton />
                        </>
                    ) : (
                        activeRequests.map((req, idx) => {
                            const isReady = Boolean(chainTime) && Number(req.releaseTime) <= chainTime;
                            const poolName =
                                stakedPools.find((p) => p.poolAddress === req.pool)?.poolName ||
                                truncatedHash(req.pool);

                            return (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-xl border transition-all ${isReady
                                        ? "bg-success/5 border-success/20 shadow-[0_0_15px_-5px_hsl(var(--success))]"
                                        : "bg-secondary/30 border-border/50"
                                        }`}
                                >
                                    <div className="flex flex-col gap-4">
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1">
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                                                    Source Pool
                                                </p>
                                                <p className="font-semibold text-sm">{poolName}</p>
                                            </div>
                                            <div
                                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isReady
                                                    ? "bg-success/20 text-success"
                                                    : "bg-warning/20 text-warning"
                                                    }`}
                                            >
                                                {isReady ? "Ready" : "Unbonding"}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                                                    Amount
                                                </p>
                                                <p className="text-lg font-bold font-mono text-primary">
                                                    {formatNumber(formatEther(req?.amount || 0n), 2)} BDAG
                                                </p>
                                            </div>
                                            <div className="text-right md:text-left">
                                                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                                                    Available On
                                                </p>
                                                <p className="text-xs font-medium">
                                                    {formatUtcDateTime(
                                                        Number(req.releaseTime) * 1000,
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </CardContent>
        </Card>
    );
};
