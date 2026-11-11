import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const PoolCardSkeleton = () => (
    <div className="pool-card animate-pulse">
        <div className="flex items-start justify-between mb-4">
            <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="space-y-1">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-4 w-20" />
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between py-3 border-t border-border/50 mb-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-10 w-10 rounded-md" />
        </div>
    </div>
);

export const StatCardSkeleton = () => (
    <Card className="glass-card border-primary/20">
        <CardContent className="p-4">
            <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-5 w-3/4" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export const RewardStatSkeleton = () => (
    <Card className="glass-card border-primary/20">
        <CardContent className="p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export const StakeItemSkeleton = () => (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-1/4" />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-2 w-12" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
            <div className="flex gap-2">
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
                <Skeleton className="h-9 w-24 rounded-md" />
            </div>
        </div>
    </div>
);

export const RewardItemSkeleton = () => (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1 space-y-4">
                <Skeleton className="h-6 w-1/3" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-1">
                            <Skeleton className="h-2 w-12" />
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
            <Skeleton className="h-9 w-32 rounded-md" />
        </div>
    </div>
);

export const PoolHeaderSkeleton = () => (
    <div className="glass-card p-6 md:p-8 mb-8 animate-pulse">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                </div>
                <Skeleton className="h-5 w-48" />
            </div>
            <div className="flex gap-4">
                <Skeleton className="h-16 w-24 rounded-lg" />
                <Skeleton className="h-16 w-24 rounded-lg" />
            </div>
        </div>
    </div>
);

export const SectionSkeleton = () => (
    <div className="glass-card p-6 animate-pulse">
        <Skeleton className="h-7 w-48 mb-6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-6 w-3/4" />
                </div>
            ))}
        </div>
    </div>
);
export const UnbondingItemSkeleton = () => (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 animate-pulse">
        <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-2 w-16" />
                    <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-2 w-12" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-2 w-12" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>
        </div>
    </div>
);
