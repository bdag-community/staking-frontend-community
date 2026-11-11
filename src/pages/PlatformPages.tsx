import { useInitialBondingPeriod } from "@/hooks/use-initial-bonding-period";
import { TransactionStatusNotice } from "@/components/ui/transaction-status-notice";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import useSWR from "swr";
import { useSignMessage } from "wagmi";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Filter,
  KeyRound,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unplug,
  WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useWallet } from "@/hooks/use-wallet";
import { usePoolAddresses } from "@/hooks/use-pool-addresses";
import { useContractVersion } from "@/hooks/use-contract-version";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { useEpochStatus } from "@/hooks/use-epoch-status";
import { estimateWithdrawalRelease } from "@/lib/withdrawal-estimate";
import { useUserRewards } from "@/hooks/use-user-rewards";
import { useUnbondingRequests } from "@/hooks/use-unbonding-requests";
import { useChainTime } from "@/hooks/use-chain-time";
import { useCredentialContract } from "@/hooks/use-credential-contract";
import { useVotingSources } from "@/hooks/use-voting-sources";
import { useStakingContract } from "@/hooks/use-staking-contract";
import { mergeLegacyPoolAddresses, useLegacyPositions } from "@/hooks/use-legacy-positions";
import useNetworkRequest from "@/hooks/use-api";
import { apiEndpoint, apiMethods } from "@/config/apiEndpoints";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";
import { ENV } from "@/config/env";
import { formatNumber, formatUtcDateTime, truncatedHash } from "@/lib/utils";
import { formatEther } from "viem";
import { formatCredentialWeight } from '@/lib/credential-eligibility';
import type { Address } from "viem";
import { sortPools, type PoolSort } from "@/lib/pool-view";
import { getFreshWalletWriteBlockReason } from "@/lib/staking-boundaries";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";
import type { PoolAddressesResponse, PoolData } from "@/utils/interface";
import { CredentialActionPanel } from "@/components/credentials/CredentialActionPanel";
import { LegacyPositionList } from "@/components/legacy/LegacyPositionList";
import { StakingPageHero, type StakingArtKind } from "@/components/layout/StakingPageHero";

const Page = ({ kind, eyebrow, title, description, children }: { kind: StakingArtKind; eyebrow: string; title: string; description: string; children: React.ReactNode }) => (
  <div className="page-shell">
    <StakingPageHero kind={kind} eyebrow={eyebrow} title={title} description={description} />
    {children}
  </div>
);

const EmptyState = ({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) => (
  <div className="glass-card flex min-h-48 flex-col items-center justify-center px-6 py-12 text-center sm:px-10">
    <Unplug className="mb-4 h-8 w-8 text-primary" aria-hidden="true" />
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{copy}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

const PoolRow = ({ pool }: { pool: PoolData }) => {
  const address = pool.poolAddress;
  return (
    <Link to={`/pools/${address}`} className="group grid grid-cols-2 items-center gap-4 border-b border-border/70 px-4 py-4 transition hover:bg-primary/[.04] focus-visible:relative sm:grid-cols-[minmax(11rem,1.8fr)_repeat(3,minmax(5rem,1fr))_auto] sm:px-5">
      <div className="col-span-2 min-w-0 sm:col-span-1">
        <p className="truncate font-semibold text-foreground group-hover:text-primary">{pool.name || `Pool ${truncatedHash(address, 6, 4)}`}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{address}</p>
      </div>
      <div><p className="font-mono text-sm text-primary">{formatNumber(pool.apy?.yearlyApy ?? 0, 2)}%</p><p className="text-xs text-muted-foreground">APY</p></div>
      <div><p className="font-mono text-sm">{formatNumber(pool.totalStaked, 2)}</p><p className="text-xs text-muted-foreground">BDAG staked</p></div>
      <div><p className="font-mono text-sm">{pool.totalStakers ?? "Unavailable"}</p><p className="text-xs text-muted-foreground">stakers</p></div>
      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
    </Link>
  );
};

export const PoolsPage = () => {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<PoolSort>("staked");
  const requestApi = useNetworkRequest();
  const fallback = usePoolAddresses();
  const { data, error, isLoading } = useSWR<PoolAddressesResponse>(apiEndpoint.poolMarket(sort), (url) => swrFetcher(requestApi, url), resilientSWRConfig);
  const pools = useMemo(() => sortPools((data?.pools ?? fallback.pools) as PoolData[], sort).filter((pool) => `${pool.poolAddress} ${pool.name ?? ""} ${pool.subtitle ?? ""}`.toLowerCase().includes(query.toLowerCase())), [data?.pools, fallback.pools, query, sort]);
  return <Page kind="pools" eyebrow="Open market" title="Choose a pool with evidence." description="Compare pool figures from the staking indexer. APY is reported by the service and can change with share price. It is not a promise of returns.">
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="relative block w-full sm:max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search pools" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or address" className="h-11 pl-9" /></label>
      <label className="flex items-center gap-2 text-sm text-muted-foreground"><Filter className="h-4 w-4" aria-hidden="true" /><span>Sort by</span><select aria-label="Sort pools" value={sort} onChange={(event) => setSort(event.target.value as PoolSort)} className="h-11 rounded-md border border-input bg-input px-3 text-foreground"><option value="staked">Total staked</option><option value="apy">APY</option><option value="stakers">Stakers</option></select></label>
    </div>
    <div className="glass-card overflow-hidden">
      <div className="hidden grid-cols-[minmax(11rem,1.8fr)_repeat(3,minmax(5rem,1fr))_auto] gap-4 border-b border-border/70 px-5 py-3 text-xs uppercase tracking-[.16em] text-muted-foreground sm:grid"><span>Pool</span><span>APY</span><span>Assets</span><span>Community</span><span /></div>
      {isLoading && !data && fallback.loading ? <div className="p-10 text-center text-sm text-muted-foreground">Loading pool figures…</div> : error && pools.length === 0 ? <div className="p-10 text-center"><p className="font-medium text-warning">Pool service unavailable.</p><p className="mt-2 text-sm text-muted-foreground">The local indexer did not return pool metadata. Retry when the service is healthy.</p></div> : pools.length ? pools.map((pool) => <PoolRow key={pool.poolAddress} pool={pool} />) : <div className="p-10 text-center"><p className="font-medium">No pools match that search.</p><p className="mt-2 text-sm text-muted-foreground">The indexer returned no matching pool metadata.</p></div>}
      {error && pools.length > 0 && <p className="border-t border-warning/20 bg-warning/5 px-5 py-3 text-xs text-warning">Pool service unavailable; showing the last indexed response where available.</p>}
    </div>
  </Page>;
};

export const PoolDetailPage = () => {
  const { address = "" } = useParams();
  const fallback = usePoolAddresses();
  const pool = fallback.pools.find((item) => item.poolAddress.toLowerCase() === address.toLowerCase());
  const requestApi = useNetworkRequest();
  const { data: figures } = useSWR(address ? apiEndpoint.poolFigures(address) : null, (url) => swrFetcher(requestApi, url), resilientSWRConfig);
  const { formatted: stakingPeriods } = useStakingPeriods();
  if (!pool && fallback.loading) return <Page kind="pools" eyebrow="Pool details" title="Loading pool…" description="Reading the latest indexed figures for this address."><div className="glass-card p-8 text-sm text-muted-foreground">Loading…</div></Page>;
  if (!pool) return <Page kind="pools" eyebrow="Pool details" title="Pool not indexed" description="This address is not currently present in the public pool index."><EmptyState title="No verified pool figures" copy="Check the address and try again. A pool appears here after the indexer observes a mining pool and its terms are registered." action={<Button asChild variant="outline-glow"><Link to="/pools">Back to pools</Link></Button>} /></Page>;
  const apy = Number(figures?.apy?.yearlyApy ?? pool.apy?.yearlyApy ?? 0);
  return <Page kind="pools" eyebrow="Pool details" title={pool.name || `Pool ${truncatedHash(pool.poolAddress, 6, 4)}`} description={pool.subtitle || "Review the pool's indexed figures and terms before signing a stake."}>
    <div className="mb-5 flex flex-wrap items-center gap-2"><Badge className="border-success/30 bg-success/10 text-success">{pool.status || "active"}</Badge>{pool.tags?.map((tag) => <Badge key={tag} variant="outline" className="border-primary/30 text-primary">{tag}</Badge>)}<span className="ml-auto font-mono text-xs text-muted-foreground">{pool.poolAddress}</span></div>
    <div className="grid gap-5 lg:grid-cols-[1.4fr_.8fr]">
      <section className="glass-card p-6 sm:p-8"><div className="grid gap-6 sm:grid-cols-3"><div><p className="data-label">Reported APY</p><p className="mt-2 font-mono text-3xl text-primary">{formatNumber(apy, 2)}%</p></div><div><p className="data-label">Pool principal</p><p className="mt-2 font-mono text-3xl">{formatNumber(figures?.totalStaked ?? pool.totalStaked, 2)} <span className="text-sm text-muted-foreground">BDAG</span></p></div><div><p className="data-label">Stakers</p><p className="mt-2 font-mono text-3xl">{figures?.totalStakers ?? pool.totalStakers ?? "Unavailable"}</p></div></div><div className="my-8 section-line" /><h2 className="text-lg font-semibold">Terms from the operator</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{pool.terms || "No operator terms have been registered for this pool yet."}</p><p className="mt-6 break-all font-mono text-xs text-muted-foreground">Pool address · {pool.poolAddress}</p></section>
      <aside className="glass-card h-fit p-6 sm:p-8"><p className="data-label">Ready to stake?</p><h2 className="mt-3 text-2xl font-semibold">Review the lock timeline first.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Stake starts the initial bonding period. Unstake starts a {stakingPeriods.unbondingTitle.toLowerCase()} exit rounded to the next epoch end.</p>{ENV.CHAIN.ID === "8008" && <p className="mt-3 text-xs text-primary">Private Devnet · accelerated epoch schedule</p>}<Button asChild className="mt-6 w-full btn-primary-glow"><Link to={`/stake?pool=${pool.poolAddress}`}>Stake in this pool <ArrowRight aria-hidden="true" /></Link></Button><Link className="mt-4 flex items-center justify-center gap-2 text-sm text-primary hover:underline" to="/pools"><ArrowLeft className="h-4 w-4" aria-hidden="true" />Compare pools</Link></aside>
    </div>
  </Page>;
};

export const RegisterPoolPage = () => {
  const { address, isConnected } = useWallet();
  const networkValidation = useWalletNetworkValidation();
  const { signMessageAsync } = useSignMessage();
  const requestApi = useNetworkRequest();
  const [form, setForm] = useState({ name: "", subtitle: "", tags: "", terms: "", pitch: "", openForDelegation: true });
  const [state, setState] = useState<"idle" | "signing" | "submitted" | "error">("idle");
  const [message, setMessage] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!address || !form.name.trim()) return;
    setState("signing"); setMessage("");
    try {
      let freshSnapshot;
      try {
        freshSnapshot = await networkValidation.readFresh();
      } catch {
        throw new Error("Unable to verify the connected wallet network immediately before signing.");
      }
      const boundaryReason = getFreshWalletWriteBlockReason({
        action: "claim",
        snapshot: freshSnapshot,
        expectedAccount: address,
        expectedChainId: Number(ENV.CHAIN.ID || 8008),
        contractVersion: "2.0.0",
        expectedGenesisHash: networkValidation.expectedGenesisHash,
      });
      if (boundaryReason) throw new Error(boundaryReason);
      // The API rejects short or predictable replay keys; this is public metadata,
      // while the wallet signature binds it to the exact registration payload.
      const nonce = typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "")
        : `${Date.now()}${Math.random().toString(36).slice(2)}`;
      const issuedAt = Date.now();
      const chainId = Number(ENV.CHAIN.ID || 8008);
      const tags = form.tags.split(",").map((tag) => tag.trim()).filter(Boolean).sort();
      const registrationFields = { address: address.toLowerCase(), name: form.name.trim(), subtitle: form.subtitle.trim(), tags: tags.join(","), terms: form.terms.trim(), pitch: form.pitch.trim(), openForDelegation: String(form.openForDelegation), chainId: String(chainId), issuedAt: String(issuedAt), nonce };
      const message = ["BDAG pool registration v1", ...Object.entries(registrationFields).map(([key, value]) => `${key}:${value}`)].join("\n");
      const signature = await signMessageAsync({ account: address as `0x${string}`, message });
      const response = await requestApi({ endpoint: apiEndpoint.registerPool, method: apiMethods.POST, body: { ...registrationFields, tags, openForDelegation: form.openForDelegation, chainId, issuedAt, signature } });
      if (!response.success) throw new Error(response.message);
      setState("submitted"); setMessage("Pool terms submitted for indexing.");
    } catch (error) { setState("error"); setMessage(error instanceof Error ? error.message : "Registration was not submitted."); }
  };
  return <Page kind="pools" eyebrow="Operator tools" title="Register pool terms." description="A pool is created by the mining engine. This signed form publishes the operator's name, terms, and delegation preference for the open market.">
    {!isConnected ? <EmptyState title="Connect the pool wallet" copy="Registration is signed by the pool key with an EIP-191 personal signature. No transaction is sent by this form." action={<ConnectButton />} /> : <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]">
      <div className="glass-card space-y-5 p-6 sm:p-8"><div className="grid gap-5 sm:grid-cols-2"><label className="space-y-2 text-sm"><span className="font-medium">Pool name <span className="text-primary">*</span></span><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="North star pool" /></label><label className="space-y-2 text-sm"><span className="font-medium">Short subtitle</span><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Reliable community operator" /></label></div><label className="space-y-2 text-sm"><span className="font-medium">Tags</span><Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="uptime, community, home operator" /><span className="block text-xs text-muted-foreground">Separate tags with commas.</span></label><label className="space-y-2 text-sm"><span className="font-medium">Terms</span><textarea required value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} className="min-h-28 w-full rounded-md border border-input bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" placeholder="How should a staker evaluate this pool?" /></label><label className="space-y-2 text-sm"><span className="font-medium">Operator pitch</span><textarea value={form.pitch} onChange={(e) => setForm({ ...form, pitch: e.target.value })} className="min-h-24 w-full rounded-md border border-input bg-input px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none" placeholder="What does your operation contribute?" /></label></div>
      <aside className="glass-card h-fit space-y-5 p-6 sm:p-8"><div><p className="data-label">Signed publication</p><p className="mt-3 text-sm leading-6 text-muted-foreground">The message includes your wallet, pool name, timestamp nonce, and terms. You review it in your wallet before the backend accepts it.</p></div><label className="flex items-start gap-3 rounded-xl border border-border/70 p-4 text-sm"><input type="checkbox" checked={form.openForDelegation} onChange={(e) => setForm({ ...form, openForDelegation: e.target.checked })} className="mt-1 accent-primary" /><span><span className="font-medium">Open for delegation</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Let stakers discover this pool in the open market.</span></span></label><Button type="submit" disabled={state === "signing" || state === "submitted"} className="w-full btn-primary-glow">{state === "signing" ? <><Loader2 className="animate-spin" />Review signature…</> : state === "submitted" ? <><Check />Submitted</> : "Sign and publish terms"}</Button>{message && <p role="status" className={`text-sm ${state === "error" ? "text-destructive" : "text-success"}`}>{message}</p>}</aside>
    </form>}
  </Page>;
};

export const CredentialsPage = () => {
  const { address, isConnected } = useWallet();
  const { timeRemaining, loading: clockLoading, error: clockError, isAwaitingConfirmation } = useEpochStatus();
  const sources = useVotingSources();
  const { isLoading: poolsLoading, error: poolsError } = sources;
  const walletPools = sources.data?.pools ?? [];
  const staking = useCredentialContract({ domain: "staking", walletPools, enabled: Boolean(sources.data?.complete) && !poolsLoading && !poolsError, sourceEpoch: sources.data?.activeVotingEpoch, sourceBlock: sources.data ? { number: sources.data.blockNumber, hash: sources.data.blockHash } : undefined });
  const mining = useCredentialContract({ domain: "mining" });
  const [actionMessage, setActionMessage] = useState("");
  const busy = staking.isPending || mining.isPending;
  const stakingAvailable = Boolean(sources.data?.complete) && !staking.error && !poolsError && !poolsLoading && (staking.data?.available ?? 0n) > 0n;
  const miningAvailable = !mining.error && (mining.data?.available ?? 0n) > 0n;
  const displayWeight = (value?: bigint,domain:'mining'|'staking'='mining') => value === undefined ? "Unavailable" : formatNumber(formatCredentialWeight(value,domain,Number(ENV.CHAIN.ID)));
  const reason = (contract: typeof staking, domain: "staking" | "mining") => {
    if (!contract.configured) return `${domain === "staking" ? "Staking" : "Mining"} voting is not available on this network.`;
    if (contract.error || (domain === "staking" && poolsError)) return "We couldn’t check your voting power. Please refresh and try again.";
    if (domain === "staking" && poolsLoading) return "Discovering your complete staking sources…";
    if (contract.isLoading || !contract.data) return "Checking your voting power…";
    if (!contract.data.ready) return "Waiting for the network to prepare this voting period. This page updates automatically.";
    if (contract.data.available > 0n) return "Your voting power is already active. You can optionally record it with a non-transferable receipt.";
    if ((contract.data.claimed ?? 0n) > 0n) return "Your optional receipt records all voting power available for this epoch.";
    if (domain === "staking" && contract.data.claimPools.length === 0) return "Stake BDAG to earn staking voting power.";
    return domain === "staking"
      ? "No staking rewards were recorded for the previous completed epoch. A deposit alone does not create votes. Rewards depend on activity in your selected pool."
      : "No eligible mining activity was recorded for your wallet in the completed period.";
  };
  const runAction = async (action: () => Promise<unknown>) => {
    setActionMessage("");
    try { await action(); setActionMessage("Confirmed. Your voting power has been updated."); }
    catch (error) { setActionMessage(error instanceof Error ? error.message : "The request could not be completed. Please refresh and try again."); }
  };
  const countdown = clockLoading || clockError ? "Unavailable" : isAwaitingConfirmation ? "Waiting for the next confirmed epoch" : timeRemaining >= 86400
    ? `${Math.floor(timeRemaining / 86400)}d ${Math.floor(timeRemaining % 86400 / 3600)}h`
    : timeRemaining >= 3600 ? `${Math.floor(timeRemaining / 3600)}h ${Math.floor(timeRemaining % 3600 / 60)}m`
    : timeRemaining > 0 ? `${Math.floor(timeRemaining / 60)}m ${timeRemaining % 60}s` : "Updating…";
  return <Page kind="credentials" eyebrow="Community governance" title="Voting power" description="See the full voting weight earned from the previous reward epoch. Power is automatic. Claiming a non-transferable receipt is optional.">
    {!isConnected ? <EmptyState title="Connect to see your voting power" copy="Use the wallet you stake or mine with to inspect earned power, its active epoch, expiry, delegation and optional receipt." action={<ConnectButton />} /> : <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <section className="glass-card p-6 sm:p-8">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Your votes this period</h2><BadgeCheck className="h-7 w-7 shrink-0 text-primary" aria-hidden="true" /></div>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Every eligible reward unit provides one full unit of power in the next epoch. Deposits and accumulated principal do not create votes. Power can be reused across proposals in its active epoch.</p>
        <dl className="my-7 grid gap-6 sm:grid-cols-2">
          <div><dt className="text-sm text-muted-foreground">Staking power</dt><dd className="mt-2 text-3xl font-semibold text-primary">{staking.error || poolsError || !sources.data?.complete ? "Unavailable" : displayWeight(staking.data?.weight,"staking")}</dd><dd className="mt-2 text-sm text-muted-foreground">{staking.error || poolsError || !sources.data?.complete ? "Unable to check" : `${displayWeight(staking.data?.claimed,"staking")} recorded in this epoch’s optional receipt`}</dd></div>
          <div><dt className="text-sm text-muted-foreground">Mining power</dt><dd className="mt-2 text-3xl font-semibold">{mining.error ? "Unavailable" : displayWeight(mining.data?.weight)}</dd><dd className="mt-2 text-sm text-muted-foreground">{mining.error ? "Unable to check" : !mining.data?.ready ? "Waiting for network results" : `${displayWeight(mining.data?.claimed)} recorded in the optional receipt`}</dd></div>
        </dl>
        <CredentialActionPanel stakingConfigured={staking.configured} miningConfigured={mining.configured}
          stakingReady={Boolean(staking.data?.ready)} miningReady={Boolean(mining.data?.ready)}
          stakingClaimable={stakingAvailable} miningClaimable={miningAvailable}
          stakingReason={reason(staking, "staking")} miningReason={reason(mining, "mining")}
          stakingEpoch={staking.data?.epoch} miningEpoch={mining.data?.epoch}
          registeredPools={staking.data?.claimPools ?? []}
          isPending={busy} actionMessage={actionMessage}
          onClaim={(domain, epoch, pools) => void runAction(() => domain === "staking" ? staking.claim(epoch, pools) : mining.claim(epoch, []))}
          onDelegate={delegatee => void runAction(() => staking.delegate(delegatee))} />
        <Button variant="ghost" className="mt-4" disabled={busy || staking.isLoading || mining.isLoading || poolsLoading} onClick={() => void (async () => { try { await sources.refetch(); await Promise.all([staking.refetch(), mining.refetch()]); } catch { setActionMessage("Complete voting power could not be refreshed. Please try again."); } })()}>Refresh voting power</Button>
      </section>
      <aside className="space-y-5">
        <section className="glass-card space-y-5 p-6 sm:p-8"><h2 className="text-xl font-semibold">How it works</h2><ol className="list-decimal space-y-4 pl-5 text-sm leading-6 text-muted-foreground"><li><strong className="text-foreground">Earn rewards.</strong> Actual pool yield and eligible coinbase rewards from the completed source epoch determine power. Principal does not.</li><li><strong className="text-foreground">Use power automatically.</strong> Power activates at rollover and remains available until the active voting epoch ends.</li><li><strong className="text-foreground">Keep optional evidence.</strong> A claimed receipt records this epoch’s earned power on-chain. It is not spendable BDAG and may not appear automatically in MetaMask. Voting does not depend on claiming it.</li></ol><div className="border-t border-border/70 pt-5"><p className="text-sm text-muted-foreground">Next voting period</p><p className="mt-2 text-2xl font-semibold text-primary">{countdown}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">The chain confirms each rollover. Power is recalculated for the new epoch. Earlier receipts remain on-chain but cannot authorize new votes.</p></div></section>
        <details className="glass-card p-6 sm:p-8"><summary className="cursor-pointer text-sm font-medium">Epoch and delegation details</summary><dl className="mt-5 space-y-4 text-sm text-muted-foreground"><div><dt>Earned source epoch</dt><dd className="mt-1 font-mono text-foreground">{staking.data?.sourceEpoch?.toString() ?? mining.data?.sourceEpoch?.toString() ?? "Unavailable"}</dd></div><div><dt>Active voting epoch</dt><dd className="mt-1 font-mono text-foreground">{staking.data?.epoch?.toString() ?? mining.data?.epoch?.toString() ?? "Unavailable"}</dd></div><div><dt>Power expiry</dt><dd className="mt-1 text-foreground">{staking.data?.expiresAt ? `${formatUtcDateTime(Number(staking.data.expiresAt) * 1000)}` : "Unavailable"}</dd></div><div><dt>Optional staking receipt</dt><dd className="mt-1 capitalize text-foreground">{staking.data?.receipt.status ?? "Unavailable"}</dd></div><div><dt>Pools used to calculate staking rewards</dt><dd className="mt-1 break-all font-mono text-xs">{staking.data?.claimPools.join(", ") || "None"}</dd></div><div><dt>Staking voting representative</dt><dd className="mt-1 break-all font-mono text-xs">{staking.data?.delegatee?.toLowerCase() === address?.toLowerCase() ? "You" : staking.data?.delegatee ?? "Unavailable"}</dd></div></dl></details>
      </aside>
    </div>}
  </Page>;
};

export const LegacyPage = () => {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();
  // Wallet pool discovery works with both the original API and the DAO indexer.
  const { data, error: discoveryError, mutate } = useSWR(address ? apiEndpoint.totalStaked(address) : null, (url) => swrFetcher(requestApi, url), resilientSWRConfig);
  const legacyStaking = useStakingContract({ version: "v1" });
  const requests = useUnbondingRequests({ version: "v1" });
  const knownPools = usePoolAddresses({ includeInactive: true });
  const clock = useChainTime();
  const bonding = useInitialBondingPeriod({version:'v1'});
  const periods = useStakingPeriods({version:'v1'});
  const [claimingPool, setClaimingPool] = useState<string | null>(null);
  const [unstakingPool, setUnstakingPool] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [manualPool, setManualPool] = useState("");
  const walletPools = (data as { pools?: { poolAddress: string }[] } | undefined)?.pools?.map(pool => pool.poolAddress) ?? [];
  const candidatePools = mergeLegacyPoolAddresses(walletPools, requests.unbondingRequests.map(request => request.pool), knownPools.pools.map(pool => pool.poolAddress), [manualPool.trim()]);
  const positions = useLegacyPositions(candidatePools);
  const now = clock.chainTime;
  const allExitsMature = now !== undefined && requests.unbondingRequests.every(request => request.isClaimed || Number(request.releaseTime) <= now);
  const claimBlocked = requests.isLoading || Boolean(requests.error) || bonding.isLoading || Boolean(bonding.error) || Boolean(clock.error) || now === undefined || !allExitsMature || bonding.bondingEndsAt > (now ?? 0);
  const refresh = async () => { await Promise.all([mutate(), positions.refetch(), requests.refetch(), bonding.refetch()]); };
  const claimLegacy = async (pool: string) => {
    if (claimBlocked) return;
    setClaimingPool(pool); setActionError(null);
    try { await legacyStaking.claim(pool, "claimStake"); await refresh(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Claim was not completed."); }
    finally { setClaimingPool(null); }
  };
  const unstakeLegacy = async (pool: string, amount: bigint) => {
    setUnstakingPool(pool); setActionError(null);
    try { await legacyStaking.unstake(pool, formatEther(amount)); await refresh(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Unstake was not completed."); }
    finally { setUnstakingPool(null); }
  };
  return <Page kind="legacy" eyebrow={ENV.NETWORK_LABEL} title="Legacy Staking" description="Withdraw from your previous staking positions. Unstake begins the waiting period; claim returns released BDAG, including rewards, to your wallet. New deposits are disabled in this view.">
    <div className="mb-6 flex flex-wrap items-center gap-4"><Button asChild variant="outline"><a href={ENV.CURRENT_URL}>Back to portfolio</a></Button><span className="text-sm text-muted-foreground">{ENV.LEGACY_ONLY ? "Separate legacy test network" : "Retained staking proxy · earlier positions"}</span></div>
    {ENV.LEGACY_REHEARSAL && <section role="note" className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-5 text-sm leading-6"><h2 className="font-semibold">Legacy exit rehearsal only</h2><p className="mt-2">These are real test deposits in the V1 contract on an isolated EVM network, not a mainnet migration. The test clock was advanced to prepare mature positions and claims. Contract waiting periods are unchanged. Your Staking V2 balance stays on the shared testnet and does not transfer here.</p></section>}
    {!ENV.LEGACY_AVAILABLE ? <EmptyState title="No legacy positions on this testnet" copy="This shared network has no legacy staking history. Legacy migration is tested on a separate preserved-state rehearsal. Your mainnet positions are not on this chain." /> : !isConnected ? <EmptyState title="Connect your staked wallet" copy="Connect the wallet you used on this network to view your positions and withdrawal dates." action={<ConnectButton />} /> : <div className="space-y-6">
      <TransactionStatusNotice transaction={legacyStaking.transactionStatus} />
      {actionError && <p role="alert" className="rounded-xl border border-warning/30 p-4 text-sm text-warning">{actionError}</p>}
      <section className="border-l-2 border-primary/50 pl-5"><h2 className="font-semibold">Two steps to withdraw</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">1. Choose an amount to unstake. 2. Return here to claim after the release date. {periods.error || periods.isLoading ? "Waiting periods are loading from the contract." : `This network uses ${periods.formatted.unbondingPlain} unbonding, rounded to an epoch boundary.`} Initial bonding and any other pending exits must also finish.</p>{bonding.bondingEndsAt > (now ?? 0) && <p className="mt-2 text-sm text-primary">Initial bonding ends {formatUtcDateTime(bonding.bondingEndsAt * 1000)}.</p>}</section>
      {(discoveryError || knownPools.error || knownPools.hasMore) && <p role="status" className="text-sm leading-6 text-warning">Pool discovery is incomplete. You can still enter a pool address below to read its position directly from the contract.</p>}
      <LegacyPositionList positions={positions.positions.filter(position => position.shares > 0n)} isLoading={positions.isLoading || knownPools.loading} error={positions.error} isPending={legacyStaking.isPending} unstakingPool={unstakingPool} onUnstake={(pool, amount) => void unstakeLegacy(pool, amount)} />
      <section className="glass-card overflow-hidden"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Waiting to withdraw</h2><p className="mt-1 text-xs text-muted-foreground">A claim settles all your matured withdrawal requests, including principal and rewards.</p></div>{requests.error ? <p role="status" className="p-5 text-sm text-warning">Withdrawal requests are unavailable. Claim is disabled until the contract read succeeds.</p> : requests.isLoading ? <p className="p-5 text-sm text-muted-foreground">Reading withdrawal requests…</p> : requests.unbondingRequests.filter(request => !request.isClaimed).length ? requests.unbondingRequests.filter(request => !request.isClaimed).map((request, index) => <div key={`${request.pool}-${index}`} className="grid gap-4 border-b border-border px-5 py-5 sm:grid-cols-[1.4fr_1fr_auto] sm:items-center"><div><p className="font-mono text-base text-primary">{formatNumber(formatEther(request.amount), 6)} BDAG</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{request.pool}</p></div><div className="text-sm"><p>{formatUtcDateTime(Number(request.releaseTime) * 1000)}</p><p className="mt-1 text-muted-foreground">{claimBlocked ? "Waiting for release conditions" : "Ready to claim"}</p></div><Button variant="outline" disabled={claimBlocked || legacyStaking.isPending || claimingPool !== null} onClick={() => void claimLegacy(request.pool)}>{claimingPool === request.pool ? "Claiming…" : "Claim BDAG"}</Button></div>) : <p className="p-5 text-sm text-muted-foreground">No pending withdrawals on this network.</p>}</section>
      <details className="glass-card p-5"><summary className="cursor-pointer text-sm font-medium">Missing a pool? Enter its address</summary><label className="mt-4 block space-y-2 text-sm"><span>Pool address</span><Input aria-label="Historical pool address" value={manualPool} onChange={event => setManualPool(event.target.value)} placeholder="0x…" /></label></details>
    </div>}
    <details className="mt-8 border-t border-border pt-5 text-sm"><summary className="cursor-pointer font-medium">Which contract am I using?</summary><p className="mt-4 break-all font-mono text-xs">{ENV.CHAIN.STAKING_V1_ADDRESS}</p><p className="mt-3 leading-6 text-muted-foreground">{ENV.LEGACY_ONLY ? "This view uses a separate legacy test network. Check its RPC, chain ID and genesis before signing. Balances do not transfer between networks." : "The upgrade retains the proxy address and existing positions. This exit-only view does not migrate funds."}</p></details>
  </Page>;
};

export const RewardsPageV2 = () => {
  const { isConnected } = useWallet();
  const { totalPendingRewards, poolRewards, isLoading, error } = useUserRewards();
  const stakingPeriods = useStakingPeriods();
  const { formatted: periods, unbondingPeriod } = stakingPeriods;
  const { chainTime } = useChainTime();
  const epochStatus = useEpochStatus();
  const rewardUnstake = useStakingContract();
  const [unstakingPool, setUnstakingPool] = useState<string | null>(null);
  const projectedRelease = epochStatus.error || stakingPeriods.error || stakingPeriods.isLoading ? undefined : estimateWithdrawalRelease({ chainTime, nextEpochStartTime: epochStatus.nextEpochStartTime, unbondingPeriod });
  const unstakeReward = async (poolAddress: string, amount: string) => { setUnstakingPool(poolAddress); try { await rewardUnstake.unstake(poolAddress, amount); } finally { setUnstakingPool(null); } };
  return <Page kind="rewards" eyebrow="Rewards" title="Track share-price appreciation." description="Unstake moves rewards into the waiting period. Claim returns released BDAG, including principal and rewards from matured withdrawal requests.">
    {!isConnected ? <EmptyState title="Connect to view rewards" copy="Rewards are specific to the connected wallet and pool positions." action={<ConnectButton />} /> : <div className="space-y-5"><section className="glass-card p-6 sm:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="data-label">Accrued across pools</p><p className="mt-2 font-mono text-4xl text-primary">{formatNumber(totalPendingRewards, 4)} <span className="text-base text-muted-foreground">BDAG</span></p></div><div className="rounded-xl border border-primary/20 bg-primary/[.05] p-4 text-right"><p className="data-label">Exit timeline</p><p className="mt-1 font-mono text-sm">{periods.unbondingTitle}</p><p className="mt-1 text-xs text-muted-foreground">{projectedRelease ? `Estimated unbonding release · ${formatUtcDateTime(projectedRelease * 1000)}` : "Exact release date loads from chain time"}</p></div></div></section><section className="glass-card overflow-hidden"><div className="border-b border-border/70 px-5 py-4"><h2 className="font-semibold">By pool</h2></div>{isLoading ? <div className="p-8 text-sm text-muted-foreground">Reading rewards…</div> : error ? <div className="p-8 text-sm text-warning">Rewards service unavailable.</div> : poolRewards.length ? poolRewards.map((reward) => <div key={reward.poolAddress} className="flex flex-col gap-3 border-b border-border/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-sm">{reward.poolAddress}</p><p className="mt-1 text-xs text-muted-foreground">Claim requires both the unbonding release and your initial bonding period to end.</p></div><p className="font-mono text-primary">{formatNumber(reward.pendingReward, 4)} BDAG</p><Button size="sm" variant="outline-glow" disabled={rewardUnstake.isPending || unstakingPool === reward.poolAddress} onClick={() => void unstakeReward(reward.poolAddress, reward.pendingReward)}>{unstakingPool === reward.poolAddress ? <Loader2 className="animate-spin" /> : "Unstake rewards"}</Button></div>) : <div className="p-8 text-sm text-muted-foreground">No accrued rewards returned.</div>}</section></div>}
  </Page>;
};
