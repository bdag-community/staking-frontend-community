import useSWR from "swr";
import { isAddress, type Address } from "viem";
import { ENV } from "@/config/env";
import { useWallet } from "@/hooks/use-wallet";
import useNetworkRequest from "@/hooks/use-api";
import { resilientSWRConfig, swrFetcher } from "@/utils/swr-helpers";

export interface VotingSources {
  interfaceVersion: "1";
  complete: true;
  chainId: number;
  genesisHash: string;
  wallet: Address;
  pools: Address[];
  activeVotingEpoch: number;
  blockNumber: number;
  blockHash: `0x${string}`;
}

export function parseVotingSources(value: unknown, wallet: string, chainId: number, genesisHash: string): VotingSources {
  if (!value || typeof value !== "object") throw new Error("Complete voting sources are unavailable.");
  const source = value as Partial<VotingSources>;
  if (source.interfaceVersion !== "1" || source.complete !== true || source.wallet?.toLowerCase() !== wallet.toLowerCase()
    || source.chainId !== chainId || source.genesisHash?.toLowerCase() !== genesisHash.toLowerCase()
    || !Number.isSafeInteger(source.activeVotingEpoch) || Number(source.activeVotingEpoch) < 0
    || !Number.isSafeInteger(source.blockNumber) || Number(source.blockNumber) < 0
    || typeof source.blockHash !== "string" || !/^0x[0-9a-f]{64}$/i.test(source.blockHash)
    || !Array.isArray(source.pools) || source.pools.length > 200 || source.pools.some(pool => typeof pool !== "string" || !isAddress(pool))) {
    throw new Error("Complete voting sources are unavailable. Refresh before claiming.");
  }
  return source as VotingSources;
}

export function useVotingSources() {
  const { address, isConnected } = useWallet();
  const requestApi = useNetworkRequest();
  const query = useSWR<VotingSources>(
    isConnected && address ? ["voting-sources-v1", ENV.CHAIN.RPC_URL, ENV.CHAIN.EXPECTED_GENESIS_HASH, address] : null,
    async () => parseVotingSources(await swrFetcher(requestApi, `/voting-pools/${address}`), address!, Number(ENV.CHAIN.ID), ENV.CHAIN.EXPECTED_GENESIS_HASH),
    { ...resilientSWRConfig, refreshInterval: 12_000, dedupingInterval: 4_000, revalidateOnFocus: true, keepPreviousData: false },
  );
  return { data: query.error ? undefined : query.data, isLoading: query.isLoading, error: query.error instanceof Error ? query.error.message : query.error ? "Voting source discovery failed." : null, refetch: query.mutate };
}
