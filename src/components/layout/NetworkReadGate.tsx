import type { ReactNode } from "react";
import useSWR from "swr";
import { createPublicClient, http } from "viem";
import { ENV } from "@/config/env";
import { isRetryableContractError } from "@/utils/contract-calls";
import { PageLoadingSkeleton } from "@/components/skeletons/PageLoadingSkeleton";

class NetworkIdentityMismatchError extends Error {}

export function NetworkReadGate({ children }: { children: ReactNode }) {
  const { data, error, mutate } = useSWR(["site-network", ENV.CHAIN.RPC_URL, ENV.CHAIN.EXPECTED_GENESIS_HASH], async () => {
    const client = createPublicClient({ transport: http(ENV.CHAIN.RPC_URL, { timeout: 10000, retryCount: 1 }) });
    const [block, chainId] = await Promise.all([client.getBlock({ blockNumber: 0n }), client.getChainId()]);
    if (block.hash?.toLowerCase() !== ENV.CHAIN.EXPECTED_GENESIS_HASH?.toLowerCase() || chainId !== Number(ENV.CHAIN.ID)) throw new NetworkIdentityMismatchError("The configured RPC serves a different network.");
    return true;
  }, {
    refreshInterval: 30000,
    shouldRetryOnError: (error: unknown) => !(error instanceof NetworkIdentityMismatchError) && isRetryableContractError(error),
    errorRetryCount: 2,
    errorRetryInterval: 2000,
  });
  if (!error && !data) return <main className="page-shell min-h-screen py-20"><img src="/logo.svg" alt="BDAG Staking" className="mb-10 h-10" /><PageLoadingSkeleton status={`Verifying ${ENV.NETWORK_LABEL} before loading balances.`} /></main>;
  if (error || !data) return <main className="page-shell min-h-screen py-20"><img src="/logo.svg" alt="BDAG Staking" className="mb-10 h-10" /><h1 className="text-3xl font-semibold">{error ? "Network connection unavailable" : "Connecting to staking…"}</h1><p role="status" className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">{error ? `We could not verify ${ENV.NETWORK_LABEL}. Balances and actions stay hidden until its RPC is reachable and matches the configured network.` : `Verifying ${ENV.NETWORK_LABEL} before loading balances.`}</p>{error && <button className="mt-6 min-h-11 rounded-full border border-primary/30 px-6 text-sm text-primary" onClick={() => void mutate()}>Retry connection</button>}</main>;
  return children;
}
