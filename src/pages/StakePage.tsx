import React, { useMemo, useState } from "react";
import { Search, ArrowRight, Clock3, ShieldCheck } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";
import { StakingPageHero } from "@/components/layout/StakingPageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StakeModal } from "@/components/ui/StakeModal";
import { usePoolAddresses } from "@/hooks/use-pool-addresses";
import { useContractVersion } from "@/hooks/use-contract-version";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { formatNumber, truncatedHash } from "@/lib/utils";

const StakePage: React.FC = () => {
  const [params] = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedPool, setSelectedPool] = useState<string | null>(params.get("pool"));
  const { pools, loading, error } = usePoolAddresses();
  const { minStake } = useContractVersion();
  const { formatted: periods } = useStakingPeriods();
  const visiblePools = useMemo(() => pools.filter((pool) => `${pool.poolAddress} ${pool.name ?? ""}`.toLowerCase().includes(query.toLowerCase())), [pools, query]);

  return <div className="page-shell">
    <StakingPageHero kind="stake" eyebrow="Stake BDAG" title="Choose a pool, review the lock, then sign." description="The contract reads its minimum stake on-chain. A stake starts the initial bonding period before rewards accrue. Every action shows its timeline before your wallet is asked to sign." />
    <div className="mb-8 grid gap-4 sm:grid-cols-3"><div className="stat-card"><p className="data-label">Minimum stake</p><p className="mt-2 font-mono text-xl text-primary">{formatNumber(minStake, 6)} BDAG</p></div><div className="stat-card"><p className="data-label">Initial bonding</p><p className="mt-2 flex items-center gap-2 font-mono text-xl"><Clock3 className="h-4 w-4 text-primary" aria-hidden="true" />{periods.initialBondingTitle}</p></div><div className="stat-card"><p className="data-label">Network fee</p><p className="mt-2 flex items-center gap-2 font-mono text-xl"><ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />Gas only</p></div></div>
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search stake pools" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search pools" className="h-11 pl-9" /></label><Link to="/pools" className="text-sm text-primary hover:underline">Compare pool figures <ArrowRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></Link></div>
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{loading && !pools.length ? [1, 2, 3].map((item) => <div key={item} className="glass-card h-56 animate-pulse bg-secondary/30" />) : visiblePools.map((pool) => <article key={pool.poolAddress} className="glass-card-hover flex flex-col p-6"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-display text-lg font-semibold">{pool.name || `Pool ${truncatedHash(pool.poolAddress, 6, 4)}`}</h2><p className="mt-1 truncate font-mono text-xs text-muted-foreground">{pool.poolAddress}</p></div><span className="status-badge-success"><span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />{pool.status || "active"}</span></div><div className="my-7 grid grid-cols-2 gap-4"><div><p className="data-label">Reported APY</p><p className="mt-1 font-mono text-lg text-primary">{formatNumber(pool.apy?.yearlyApy ?? 0, 2)}%</p></div><div><p className="data-label">Assets</p><p className="mt-1 font-mono text-lg">{formatNumber(pool.totalStaked, 2)}</p></div></div><Button onClick={() => setSelectedPool(pool.poolAddress)} className="mt-auto w-full btn-primary-glow">Review stake <ArrowRight aria-hidden="true" /></Button></article>)}{!loading && !visiblePools.length && <div className="glass-card col-span-full p-10 text-center"><p className="font-medium">No open pools returned.</p><p className="mt-2 text-sm text-muted-foreground">{error || "The pool indexer has not returned a matching active pool."}</p></div>}</div>
    <StakeModal pool={selectedPool} isOpen={Boolean(selectedPool)} onClose={() => setSelectedPool(null)} />
  </div>;
};

export default StakePage;
