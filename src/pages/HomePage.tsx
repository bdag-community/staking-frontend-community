import { Link } from "react-router-dom";
import { ArrowRight, CircleGauge, Clock3, Coins, ShieldCheck, Vote } from "lucide-react";
import { totalPoolPrincipal } from "@/lib/pool-total";
import { useRewardSplit } from "@/hooks/use-reward-split";
import { Button } from "@/components/ui/button";
import { useGlobalStats } from "@/hooks/use-global-stats";
import { usePoolAddresses } from "@/hooks/use-pool-addresses";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { useEpochStatus } from "@/hooks/use-epoch-status";
import { formatDurationHyphenated } from "@/utils/duration";
import { useContractVersion } from "@/hooks/use-contract-version";
import { ENV } from "@/config/env";
import { formatNumber } from "@/lib/utils";
import { StakingHeroBackdrop } from "@/components/home/StakingHeroBackdrop";
import { StakingHeroHeadline } from "@/components/home/StakingHeroHeadline";

export default function HomePage() {
  const { globalStats, error: statsError, isLoading } = useGlobalStats();
  const directory = usePoolAddresses({ includeInactive: true });
  const periods = useStakingPeriods();
  const votingClock = useEpochStatus();
  const votingTimingReady = !votingClock.loading && !votingClock.error && Number.isSafeInteger(votingClock.epochDuration) && votingClock.epochDuration > 0;
  const contract = useContractVersion();
  const split = useRewardSplit();
  const directoryReady = !directory.loading && !directory.error && !directory.hasMore;
  const total = directoryReady ? totalPoolPrincipal(directory.pools) : null;
  const statsReady = !isLoading && !statsError && globalStats &&
    Number.isFinite(globalStats.avgApy) && globalStats.avgApy >= 0 &&
    Number.isInteger(globalStats.activePoolsCount) && globalStats.activePoolsCount >= 0 &&
    Number.isInteger(globalStats.totalPoolsCount) && globalStats.totalPoolsCount >= globalStats.activePoolsCount;
  const timingReady = !periods.isLoading && !periods.error;
  const steps = [
    ["01", "Choose a pool", "Stake BDAG with a mining pool. Your deposit gives you shares that represent your part of that pool."],
    ["02", "Earn as the pool earns", "Staker rewards add to the pool’s assets. As the value of each share grows, so does the BDAG value of your position."],
    ["03", "Unstake, then claim", "Unstake some or all of your position to begin the waiting period. Once your exit is ready, claim the BDAG back to your wallet."],
  ];
  return <div className="page-shell landing-page-shell space-y-14 sm:space-y-20">
    <section className="staking-hero landing-hero-full-bleed">
      <StakingHeroBackdrop />
      {ENV.IS_TESTNET && <div className="landing-hero-status"><span role="status" className="status-badge-primary max-w-full">{ENV.NETWORK_LABEL} · test BDAG only</span></div>}
      <div className="landing-hero-content">
        <div className="max-w-3xl"><p className="data-label text-primary">BlockDAG community staking</p><StakingHeroHeadline /><p className="page-lead mt-7 max-w-2xl">Stake BDAG with a mining pool, follow your share of its rewards, and decide when to exit. Every transaction stays in your wallet for review before it reaches the network.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/pools">Explore pools <ArrowRight className="h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/portfolio">Your portfolio</Link></Button></div></div>
      </div>
    </section>

    <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
      <article className="glass-card p-6 sm:p-8"><div className="staking-glass-icon"><Vote className="h-6 w-6" /></div><p className="data-label mt-6 text-primary">Staking voting power</p><h2 className="mt-3 text-2xl font-semibold">Earn your voice through pool rewards</h2><p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Every eligible staking reward carries its full voting weight in the next epoch. Deposits and existing principal do not add votes. Your power is active automatically, expires with the voting epoch, and can be recorded with an optional non-transferable receipt.</p><Button asChild className="mt-6"><Link to="/credentials">View voting power <ArrowRight className="h-4 w-4" /></Link></Button></article>
      <aside className="glass-card p-6 sm:p-8"><p className="data-label">Before you stake</p><p className="mt-4 text-lg leading-8">Rewards vary by pool.<br />Withdrawals have a waiting period.<br />You approve every transaction.</p><p className="mt-5 text-sm leading-6 text-muted-foreground">{contract.isLoading ? "Reading the minimum deposit…" : contract.error ? "Minimum deposit is temporarily unavailable." : `You can start from ${formatNumber(contract.minStake, 4)} BDAG.`}</p></aside>
    </section>

    <section aria-labelledby="network-overview"><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><h2 id="network-overview" className="text-2xl font-semibold">Staking across the network</h2><span className="data-label text-primary">{ENV.NETWORK_LABEL}</span></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="stat-card"><p className="data-label">Total staked · all pools</p><p className="mt-3 font-mono text-3xl text-primary">{total === null ? "Unavailable" : formatNumber(total, 2)} {total !== null && <span className="text-sm text-muted-foreground">BDAG</span>}</p><p className="mt-3 text-sm text-muted-foreground">Principal across active and inactive pools.</p></div>
        <div className="stat-card"><p className="data-label">Active pools</p><p className="mt-3 font-mono text-3xl">{statsReady ? globalStats.activePoolsCount : "Unavailable"}{statsReady && <span className="text-sm text-muted-foreground"> / {globalStats.totalPoolsCount} total</span>}</p><p className="mt-3 text-sm text-muted-foreground">Compare pools before choosing where to stake.</p></div>
        <div className="stat-card"><p className="data-label">Average estimated APY</p><p className="mt-3 font-mono text-3xl">{statsReady ? `${formatNumber(globalStats.avgApy, 2)}%` : "Unavailable"}</p><p className="mt-3 text-sm text-muted-foreground">Weighted by stake in active pools. Variable, not guaranteed.</p></div>
      </div>{(statsError || (!isLoading && !statsReady) || directory.error || directory.hasMore || (directoryReady && total === null)) && <p role="status" className="mt-4 text-sm text-warning">Some network figures are unavailable or still loading. An unavailable value is not zero.</p>}
      {ENV.IS_TESTNET && <p className="mt-4 text-sm leading-6 text-muted-foreground">This is a private test network. Its accelerated rewards and timing do not predict mainnet returns. Balances on another devnet are separate.</p>}
    </section>

    <section aria-labelledby="how-it-works"><p className="data-label mb-3 text-primary">A clear path from deposit to exit</p><h2 id="how-it-works" className="mb-7 text-2xl font-semibold">Three steps. One place to manage them.</h2><div className="grid gap-4 md:grid-cols-3">{steps.map(([number, title, copy], index) => { const Icon = [Coins, CircleGauge, Clock3][index]; return <article key={number} className="glass-card p-6"><div className="flex items-center justify-between"><div className="staking-glass-icon"><Icon className="h-5 w-5" /></div><span className="font-mono text-sm text-primary">{number}</span></div><h3 className="mt-6 text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{copy}</p></article>; })}</div></section>

    <section className="grid gap-8 lg:grid-cols-2"><div className="glass-card p-6 sm:p-8"><h2 className="text-2xl font-semibold">Understand your rewards</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">APY means annual percentage yield: an estimate of what a pool could earn over a year at current conditions. Your actual rewards depend on the pool’s mining rewards, total stake, and protocol settings.</p><p className="mt-4 text-sm leading-7 text-muted-foreground">{split.data && !split.error ? `The current subsidy split is ${split.data.miners}% for miners and ${split.data.stakers}% for stakers. That ${split.data.stakers}% is the stakers’ share of mining rewards, not a ${split.data.stakers}% return on your deposit.` : "The current miner/staker reward split is temporarily unavailable."}</p><p className="mt-4 text-sm leading-7 text-muted-foreground">Rewards stay in your pool position automatically. To withdraw earnings, unstake that amount, wait for release, then claim. There is no separate instant reward payout.</p><Link to="/pools" className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">Compare current pool rates <ArrowRight className="h-4 w-4" /></Link></div>
      <div className="glass-card p-6 sm:p-8"><h2 className="text-2xl font-semibold">Know when you can withdraw</h2><dl className="mt-5 divide-y divide-border text-sm">{[["Initial bonding period", timingReady ? periods.formatted.initialBondingPlain : "Unavailable"], ["Unbonding period", timingReady ? periods.formatted.unbondingPlain : "Unavailable"], ["Reward epoch", timingReady ? periods.formatted.epochPlain : "Unavailable"]].map(([label, value]) => <div key={label} className="flex justify-between gap-4 py-4"><dt className="text-muted-foreground">{label}</dt><dd className="text-right font-medium">{value}</dd></div>)}</dl><p className="mt-4 text-sm leading-7 text-muted-foreground">Release is rounded to an epoch boundary. Your portfolio shows the exact time. Initial bonding, other pending exits, and contract restrictions may delay claiming.</p><p className="mt-4 text-xs leading-6 text-primary">{votingTimingReady ? `Voting uses ${formatDurationHyphenated(votingClock.epochDuration / 1000)} epochs on this network.` : "Voting epoch timing is temporarily unavailable."} Deposit locks and withdrawal waiting periods are separate and are read from the staking contract above.</p></div></section>
    <section className="glass-card grid gap-6 p-6 sm:p-8 lg:grid-cols-[auto_1fr_auto] lg:items-center"><div className="staking-glass-icon"><ShieldCheck className="h-6 w-6" /></div><div><h2 className="text-xl font-semibold">Built for verification, not guesswork</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">Pool totals, timing, contract details, and credential status come from the configured BlockDAG network. If a value cannot be verified, the interface labels it unavailable instead of treating it as zero.</p></div><Link to="/#network-details" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">Read the safeguards <ArrowRight className="h-4 w-4" /></Link></section>
    <details id="network-details" className="border-y border-border py-5"><summary className="cursor-pointer text-sm font-medium">Network and contract details</summary><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Network</dt><dd className="mt-1">{ENV.NETWORK_LABEL} · chain {ENV.CHAIN.ID}</dd></div><div><dt className="text-muted-foreground">Staking contract</dt><dd className="mt-1 break-all font-mono text-xs">{contract.address}</dd></div><div className="sm:col-span-2"><dt className="text-muted-foreground">Genesis hash</dt><dd className="mt-1 break-all font-mono text-xs">{ENV.CHAIN.EXPECTED_GENESIS_HASH}</dd></div></dl><p className="mt-5 text-sm leading-6 text-muted-foreground">Existing positions stay at the retained staking proxy when it upgrades. Legacy Staking in your portfolio provides an exit-only view.</p></details>
  </div>;
}
