import useSWR from "swr";
import { useConnectorClient, useConnection, useChainId } from "wagmi";
import { getConnectorClient } from "@wagmi/core";
import { ENV } from "@/config/env";
import { wagmiAdapter } from "@/config/reown";
import { isRetryableContractError } from "@/utils/contract-calls";

type GenesisBlock = { hash?: string | null } | null;

const accountAddress = (account: unknown) => {
  if (typeof account === "string") return account;
  if (account && typeof account === "object" && "address" in account && typeof account.address === "string") return account.address;
  return null;
};

/** Read the selected wallet provider immediately before a mutation. */
export const readFreshWalletNetwork = async () => {
  const client = await getConnectorClient(wagmiAdapter.wagmiConfig);
  const connector = client as unknown as { request: (args: { method: string; params?: readonly unknown[] }) => Promise<unknown> };
  const [chainIdResult, block] = await Promise.all([
    connector.request({ method: "eth_chainId", params: [] }),
    connector.request({ method: "eth_getBlockByNumber", params: ["0x0", false] }) as Promise<GenesisBlock>,
  ]);
  const chainId = typeof chainIdResult === "string" ? Number.parseInt(chainIdResult, 16) : undefined;
  return { chainId, genesisHash: block?.hash?.toLowerCase() ?? null, account: accountAddress((client as unknown as { account: unknown }).account) };
};

/**
 * Chain ID alone is insufficient for candidate networks: a wallet can expose
 * the same numeric ID over a different genesis. Read block zero through the
 * selected connector before enabling any staking write.
 */
export const useWalletNetworkValidation = () => {
  const chainId = useChainId();
  const { address, isConnected } = useConnection();
  const { data: client, isLoading: isClientLoading } = useConnectorClient();
  const expectedGenesisHash = ENV.CHAIN.EXPECTED_GENESIS_HASH.toLowerCase();
  const key = isConnected && client && address
    ? ["wallet-genesis", chainId, address, expectedGenesisHash]
    : null;

  const { data: genesisHash, error, isLoading, mutate } = useSWR<string | null>(
    key,
    async () => {
      if (!client) return null;
      const connector = client as unknown as { request: (args: { method: string; params: readonly unknown[] }) => Promise<unknown> };
      const block = await connector.request({
        method: "eth_getBlockByNumber",
        params: ["0x0", false],
      }) as GenesisBlock;
      return block?.hash?.toLowerCase() ?? null;
    },
    {
      revalidateOnFocus: false,
      refreshInterval: 30000,
      // SWR stops interval polling after an error. Recover temporary read
      // failures, but never use cached verification while recovery is pending.
      shouldRetryOnError: isRetryableContractError,
      errorRetryCount: 2,
      errorRetryInterval: 2000,
    },
  );

  const isGenesisChecking = Boolean(isConnected && (!client || isClientLoading || isLoading));
  // A retained SWR value is not current verification after a failed refresh.
  // Return no usable hash so every existing signing guard remains fail-closed.
  const verifiedGenesisHash = error ? null : genesisHash;
  const isGenesisValid = Boolean(isConnected && client && !error && genesisHash && genesisHash === expectedGenesisHash);

  return {
    chainId,
    genesisHash: verifiedGenesisHash,
    expectedGenesisHash,
    isGenesisChecking,
    isGenesisValid,
    genesisError: error instanceof Error ? error.message : error ? "Unable to verify wallet network genesis." : null,
    retry: () => mutate().catch(() => undefined),
    readFresh: readFreshWalletNetwork,
  };
};
