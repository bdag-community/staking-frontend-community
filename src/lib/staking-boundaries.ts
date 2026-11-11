export type BoundaryAction = "stake" | "unstake" | "claim";

export type FreshWalletNetwork = {
  chainId?: number;
  genesisHash?: string | null;
  account?: string | null;
};

type BoundaryInput = {
  action: BoundaryAction;
  chainId?: number;
  expectedChainId: number;
  contractVersion: string;
  isPending?: boolean;
  isClaimable?: boolean;
  genesisHash?: string | null;
  expectedGenesisHash?: string;
  isGenesisChecking?: boolean;
};

/** Pure guard used by the wallet UI and boundary tests before a write is signed. */
export const getStakingActionBlockReason = ({
  action,
  chainId,
  expectedChainId,
  contractVersion,
  isPending = false,
  isClaimable = true,
  genesisHash,
  expectedGenesisHash,
  isGenesisChecking = false,
}: BoundaryInput): string | null => {
  if (isPending) return "A staking transaction is already awaiting a receipt.";
  if (chainId !== undefined && chainId !== expectedChainId) {
    return "Switch to the BlockDAG network before signing.";
  }
  if (isGenesisChecking) return "Verifying the connected wallet network before signing.";
  if (expectedGenesisHash && genesisHash?.toLowerCase() !== expectedGenesisHash.toLowerCase()) {
    return "This wallet is connected to a different BlockDAG network. Switch to the verified private devnet before signing.";
  }
  if (action === "stake" && !contractVersion.startsWith("2.")) {
    return "Staking is paused until the V2 contract is active.";
  }
  if (action === "claim" && !isClaimable) {
    return "This position is not mature enough to claim yet.";
  }
  return null;
};

/**
 * Final write guard: the provider snapshot must be read immediately before
 * simulation, and it must still belong to the wallet that started the action.
 */
export const getFreshWalletWriteBlockReason = ({
  action,
  snapshot,
  expectedAccount,
  expectedChainId,
  contractVersion,
  expectedGenesisHash,
  isPending = false,
}: {
  action: BoundaryAction;
  snapshot: FreshWalletNetwork;
  expectedAccount?: string | null;
  expectedChainId: number;
  contractVersion: string;
  expectedGenesisHash?: string;
  isPending?: boolean;
}) => {
  if (expectedAccount && snapshot.account?.toLowerCase() !== expectedAccount.toLowerCase()) {
    return "The connected wallet changed. Reconnect the wallet before signing.";
  }
  return getStakingActionBlockReason({
    action,
    chainId: snapshot.chainId,
    expectedChainId,
    contractVersion,
    isPending,
    genesisHash: snapshot.genesisHash,
    expectedGenesisHash,
  });
};
