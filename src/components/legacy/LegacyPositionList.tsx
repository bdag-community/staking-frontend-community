import React, { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Address } from "viem";
import { formatEther, parseEther } from "viem";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LegacyPosition } from "@/hooks/use-legacy-positions";

type LegacyPositionListProps = {
  positions: LegacyPosition[];
  isLoading: boolean;
  error: string | null;
  isPending: boolean;
  unstakingPool: string | null;
  onUnstake: (pool: Address, amount: bigint) => void;
};

export const LegacyPositionList = ({ positions, isLoading, error, isPending, unstakingPool, onUnstake }: LegacyPositionListProps) => (
  <LegacyPositionListBody positions={positions} isLoading={isLoading} error={error} isPending={isPending} unstakingPool={unstakingPool} onUnstake={onUnstake} />
);

const LegacyPositionListBody = ({ positions, isLoading, error, isPending, unstakingPool, onUnstake }: LegacyPositionListProps) => {
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const rows = useMemo(() => positions.map((position) => ({ ...position, max: formatEther(position.liquidValue), principalText: formatEther(position.principal), liquidText: formatEther(position.liquidValue) })), [positions]);
  return <div className="glass-card overflow-hidden">
    <div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">Your staked positions</h2><p className="mt-1 text-xs text-muted-foreground">Amounts come from the previous contract at this wallet and pool. Historical event totals are not used as balances.</p></div>
    {isLoading ? <div className="p-8 text-sm text-muted-foreground">Reading staked positions…</div> : error ? <div className="p-8 text-sm text-warning">Position read unavailable; unstake is disabled until the chain read succeeds.</div> : rows.length ? rows.map((position) => { const chosen = amounts[position.pool] ?? position.max; let chosenRaw = 0n; try { chosenRaw = parseEther(chosen || "0"); } catch { chosenRaw = 0n; } const valid = chosenRaw > 0n && chosenRaw <= position.liquidValue; return <div key={position.pool} className="grid gap-3 border-b border-border/70 px-5 py-4 sm:grid-cols-[1.35fr_1fr_auto] sm:items-center"><div><span className="block break-all font-mono text-xs">{position.pool}</span><span className="mt-1 block text-xs text-muted-foreground">{position.liquidText} BDAG redeemable at block {position.blockNumber.toString()} · {position.principalText} BDAG principal</span><span className="mt-1 block text-xs text-primary">Choose a partial exit amount; Max uses the current redeemable value.</span></div><div className="flex items-center gap-2"><Input aria-label={`Unstake amount for ${position.pool}`} value={chosen} onChange={(event) => setAmounts((current) => ({ ...current, [position.pool]: event.target.value }))} inputMode="decimal" className="h-9 min-w-0 font-mono" /><Button type="button" size="sm" variant="outline" onClick={() => setAmounts((current) => ({ ...current, [position.pool]: position.max }))}>Max</Button></div><Button size="sm" variant="outline-glow" disabled={!valid || isPending || unstakingPool === position.pool} onClick={() => onUnstake(position.pool, chosenRaw)}>{unstakingPool === position.pool ? <Loader2 className="animate-spin" /> : "Unstake chosen amount"}</Button></div>; }) : <div className="p-8 text-sm text-muted-foreground">No stake was found in the pools checked on this network.</div>}
  </div>
};
