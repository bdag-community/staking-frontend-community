import React from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { useWallet } from "@/hooks/use-wallet";
import { useContractVersion } from "@/hooks/use-contract-version";
import { useTotalStaked } from "@/hooks/use-total-staked";
import { formatNumber } from "@/lib/utils";
import { ENV } from "@/config/env";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {ExplorerLink} from "@/components/ui/explorer-link";
import {explorerUrl} from "@/lib/explorer-url";
import { CopyButton } from "@/components/ui/copy-button";

const navItems = ENV.LEGACY_ONLY ? [["Legacy Staking", "/legacy"]] as const : [
  ["Home", "/"], ["Portfolio", "/portfolio"], ["Pools", "/pools"], ["Stake", "/stake"], ["Rewards", "/rewards"], ["Voting tokens", "/credentials"],
] as const;

export const TopBar: React.FC = () => {
  const location = useLocation();
  const { isConnected, address, shortenAddress, disconnect, userBalance } = useWallet();
  const { totalStaked, error: balanceError, isLoading: balanceLoading } = useTotalStaked();
  const { version, minStake, isLoading, error: contractError } = useContractVersion();
  return <header className="fixed inset-x-0 top-0 z-40 border-b border-border/80 bg-background/95 backdrop-blur-xl"><div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-4 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] md:pl-[max(2rem,env(safe-area-inset-left))] md:pr-[max(2rem,env(safe-area-inset-right))]"><SidebarTrigger className="lg:hidden" /><Link to="/" className="flex shrink-0 items-center" aria-label="BDAG Staking home"><img src="/logo.svg" alt="BDAG Staking" className="h-10 w-auto" /></Link><nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-0 xl:gap-1 lg:flex">{navItems.map(([label, href]) => <Link key={href} to={href} className={`rounded-full px-3 py-2 text-sm transition ${location.pathname === href || (href !== "/" && location.pathname.startsWith(href)) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"}`}>{label}</Link>)}</nav><div className="ml-auto flex items-center gap-2">{isConnected ? <><span className="hidden rounded-full border border-border/70 bg-secondary/40 px-3 py-2 font-mono text-xs text-muted-foreground xl:inline">{isLoading ? "Contract …" : contractError ? "Contract unavailable" : `v${version} · min ${formatNumber(minStake, 4)} BDAG`}</span><span className="hidden font-mono text-xs text-primary sm:inline">{balanceError || balanceLoading ? "Unavailable" : formatNumber(totalStaked, 2)} BDAG</span><details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-primary/30 bg-primary/[.06] px-4 text-sm hover:bg-primary/10"><span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />{shortenAddress}<span className="sr-only">Open wallet actions</span></summary><div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-border bg-card p-4 shadow-2xl"><p className="data-label">Wallet balance</p><p className="mt-1 font-mono text-lg text-primary">{formatNumber(userBalance, 4)} BDAG</p><p className="mt-3 truncate font-mono text-xs text-muted-foreground">{address}</p><div className="mt-4 flex gap-2"><CopyButton value={address || ""} text="Copy" className="flex-1" />{explorerUrl(`address/${address}`) && <Button asChild variant="outline" size="sm"><ExplorerLink path={`address/${address}`} target="_blank" rel="noreferrer" aria-label="View wallet on explorer"><ExternalLink /></ExplorerLink></Button>}<Button variant="outline" size="sm" onClick={() => disconnect()} aria-label="Disconnect wallet"><LogOut /></Button></div></div></details></> : <ConnectButton />}</div></div>{isConnected && <div className="flex gap-1 overflow-x-auto border-t border-border/50 px-4 py-2 lg:hidden">{navItems.map(([label, href]) => <Link key={href} to={href} className={`whitespace-nowrap rounded-full px-4 py-2 text-xs ${location.pathname === href ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}>{label}</Link>)}</div>}</header>;
};
