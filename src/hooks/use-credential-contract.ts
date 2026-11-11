import { claimableVotes, credentialErrorMessage, mergeCredentialPools } from "@/lib/credential-eligibility";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { getBlock, getBlockNumber, getBytecode, readContract, simulateContract, switchChain, waitForTransactionReceipt, writeContract } from "@wagmi/core";
import { keccak256, type Address } from "viem";
import { credentialAbi } from "@/contract/credential-abi";
import { versionedChainTallyReaderAbi } from "@/contract/versioned-chain-tally-reader-abi";
import { ENV } from "@/config/env";
import { blockdagTestnet, wagmiAdapter } from "@/config/reown";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { readContractWithRetry } from "@/utils/contract-calls";
import { getFreshWalletWriteBlockReason } from "@/lib/staking-boundaries";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";

export type CredentialDomain = "mining" | "staking";

export const useCredentialContract = ({ domain = "staking", walletPools = [], sourceEpoch, sourceBlock, enabled = true }: { domain?: CredentialDomain; walletPools?: Address[]; sourceEpoch?: number; sourceBlock?: { number: number; hash: string }; enabled?: boolean } = {}) => {
  const { address, isConnected } = useWallet();
  const networkValidation = useWalletNetworkValidation();
  const { toast } = useToast();
  const credentialAddress = domain === "mining"
    ? ENV.CHAIN.MINING_CREDENTIAL_ADDRESS
    : ENV.CHAIN.STAKING_CREDENTIAL_ADDRESS;
  const configured = Boolean(credentialAddress);
  const [isPending, setIsPending] = useState(false);
  const [lastHash, setLastHash] = useState<`0x${string}`>();

  // Discovery advances its evidence block every poll. That block is validated
  // by each fetch, not a different electorate: putting it in the cache key
  // discards in-flight previews and blanks fresh results on a busy chain.
  // Wallet/network, source epoch and complete pool set still isolate the cache.
  const { data, error, isLoading, mutate } = useSWR(
    enabled && configured && isConnected && address ? ["credential-contract-v1", ENV.CHAIN.RPC_URL, ENV.CHAIN.EXPECTED_GENESIS_HASH, ENV.CHAIN.EPOCH_CLOCK_INTERFACE, ENV.CHAIN.EPOCH_READER_CODE_HASH, domain, credentialAddress, address, mergeCredentialPools([], walletPools).join(","), sourceEpoch] : null,
    async () => {
      const account = address as Address;
      // Pin all eligibility reads to one block so an epoch rollover cannot mix snapshots.
      const blockNumber = await getBlockNumber(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, cacheTime: 0 });
      const before = await getBlock(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, blockNumber });
      if (!before.hash || before.number !== blockNumber) throw new Error("Voting snapshot block is unavailable. Refresh current power.");
      if (domain === "staking" && sourceBlock) {
        if (!Number.isSafeInteger(sourceBlock.number) || sourceBlock.number < 0 || BigInt(sourceBlock.number) > blockNumber) throw new Error("Voting source evidence is ahead of the canonical snapshot. Refresh sources.");
        const sourceHeader = BigInt(sourceBlock.number) === blockNumber ? before : await getBlock(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, blockNumber: BigInt(sourceBlock.number) });
        if (!sourceHeader.hash || sourceHeader.hash.toLowerCase() !== sourceBlock.hash.toLowerCase()) throw new Error("Voting source evidence changed on the canonical chain. Refresh sources.");
      }
      const read = <T,>(functionName: string, args?: readonly unknown[]) => readContractWithRetry<T>(wagmiAdapter.wagmiConfig, {
        chainId: blockdagTestnet.id, address: credentialAddress as Address, abi: credentialAbi, functionName, args, blockNumber,
      } as unknown as Parameters<typeof readContract>[1], "Voting power");
      const [pools, epoch, ready] = await Promise.all([
        read<Address[]>("poolsOf", [account]), read<bigint>("currentEpoch"), read<boolean>("votingReady"),
      ]);
      if (domain === "staking" && sourceEpoch !== undefined && BigInt(sourceEpoch) !== epoch) {
        throw new Error("The voting period changed. Refreshing complete staking sources.");
      }
      // Explicit pools allow a new staker to claim without a separate registration transaction.
      const operatorShares = domain==='staking' ? await readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, {
        chainId:blockdagTestnet.id,address:ENV.CHAIN.STAKING_CONTRACT_ADDRESS,abi:[{type:'function',name:'poolTotalShares',stateMutability:'view',inputs:[{name:'pool',type:'address'}],outputs:[{type:'uint256'}]}] as const,functionName:'poolTotalShares',args:[account],blockNumber,
      } as unknown as Parameters<typeof readContract>[1],'Operator pool') : 0n;
      const claimPools = domain === "mining" ? [] : mergeCredentialPools(pools, [...walletPools,...(operatorShares>0n?[account]:[])]);
      const [weight, claimed, delegatee, isDelegate, total, epochDuration, genesisTime] = await Promise.all([
        ready ? read<bigint>("rawWeightOf", [account, epoch, claimPools]) : Promise.resolve(undefined),
        read<bigint>("balanceOf", [account, epoch]),
        read<Address>("delegateAt", [account, epoch]),
        read<boolean>("isDelegate", [account, epoch]),
        ready ? read<bigint>("totalSupplyAt", [epoch]) : Promise.resolve(undefined),
        read<bigint>("epochDuration"),
        read<bigint>("genesisTime"),
      ]);
      let expiresAt: bigint;
      if (ENV.CHAIN.EPOCH_CLOCK_INTERFACE === "3") {
        const reader = ENV.CHAIN.READER_ADDRESS;
        const expectedCodeHash = ENV.CHAIN.EPOCH_READER_CODE_HASH;
        if (!reader || !expectedCodeHash || !/^0x[0-9a-f]{64}$/i.test(expectedCodeHash)) throw new Error("Versioned voting clock is not configured.");
        const code = await getBytecode(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, address: reader, blockNumber });
        if (!code || keccak256(code).toLowerCase() !== expectedCodeHash.toLowerCase()) throw new Error("Voting clock reader does not match the release.");
        const readerRead = <T,>(functionName: string, args?: readonly unknown[]) => readContractWithRetry<T>(wagmiAdapter.wagmiConfig, {
          chainId: blockdagTestnet.id, address: reader, abi: [...versionedChainTallyReaderAbi,{type:'function',name:'activeStakingSource',stateMutability:'view',inputs:[],outputs:[{type:'address'}]}], functionName, args, blockNumber,
        } as unknown as Parameters<typeof readContract>[1], "Voting clock");
        const [bounds, source] = await Promise.all([
          readerRead<{ epoch: bigint; version: bigint; start: bigint; end: bigint; duration: bigint }>("epochBounds", [epoch]),
          readerRead<Address>("clockSource"),
        ]);
        const expectedClockSource = ENV.CHAIN.STAKING_V1_ADDRESS ?? ENV.CHAIN.STAKING_CONTRACT_ADDRESS;
        const separated = expectedClockSource.toLowerCase() !== ENV.CHAIN.STAKING_CONTRACT_ADDRESS.toLowerCase();
        const activeSource = separated ? await readerRead<Address>('activeStakingSource') : ENV.CHAIN.STAKING_CONTRACT_ADDRESS;
        if (source.toLowerCase() !== expectedClockSource.toLowerCase() || activeSource.toLowerCase() !== ENV.CHAIN.STAKING_CONTRACT_ADDRESS.toLowerCase() ||
          [bounds.epoch, bounds.version, bounds.start, bounds.end, bounds.duration].some(value => typeof value !== "bigint" || value < 0n || value > (1n << 64n) - 1n) ||
          bounds.epoch !== epoch || bounds.version === 0n || bounds.duration !== epochDuration || bounds.start < genesisTime ||
          bounds.duration <= 0n || bounds.end - bounds.start !== bounds.duration || typeof before.timestamp !== "bigint" || before.timestamp < 0n || before.timestamp >= bounds.end) throw new Error("Invalid voting clock epoch metadata.");
        expiresAt = bounds.end;
      } else {
        if (ENV.CHAIN.EPOCH_CLOCK_INTERFACE && ENV.CHAIN.EPOCH_CLOCK_INTERFACE !== "2") throw new Error("Unsupported voting clock interface.");
        expiresAt = genesisTime + (epoch + 1n) * epochDuration;
      }
      const available = claimableVotes(ready, weight, claimed);
      const verifiedEpoch = await readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, {
        chainId: blockdagTestnet.id, address: credentialAddress as Address, abi: credentialAbi, functionName: "currentEpoch",
      } as unknown as Parameters<typeof readContract>[1], "Current voting period");
      if (verifiedEpoch !== epoch) throw new Error("The voting period changed during the read. Refresh current voting power.");
      const after = await getBlock(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, blockNumber });
      if (after.hash !== before.hash || after.number !== blockNumber) throw new Error("Voting snapshot changed during the read. Refresh after the chain reorganization.");
      return { interfaceVersion: "1" as const, weight, total, pools, claimPools, epoch, sourceEpoch: epoch > 0n ? epoch - 1n : 0n, expiresAfterEpoch: epoch + 1n, expiresAt, ready, claimed, delegatee, isDelegate, delegated: delegatee.toLowerCase() !== account.toLowerCase(), blockNumber, blockHash: before.hash, available, lastUpdatedAt: Date.now(), checkedAt: performance.now(), receipt: { status: claimed > 0n ? "claimed" as const : available > 0n ? "available" as const : "none" as const, claimedWeight: claimed, claimableWeight: available } };
    },
    { refreshInterval: 12_000, dedupingInterval: 4_000, revalidateOnFocus: true, keepPreviousData: false, errorRetryCount: 2 },
  );
  // SWR's normal interval skips errored caches after its bounded retries. An
  // epoch rollover can legitimately invalidate a read longer than that retry
  // window. Retry at the normal cadence only while this preview is visible;
  // every retry still executes all canonical snapshot and network checks.
  useEffect(() => {
    if (!enabled || !configured || !isConnected || !address || !error) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") timer = setTimeout(() => { void mutate(); }, 12_000);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", schedule); };
  }, [enabled, configured, isConnected, address, error, mutate]);
  const [now, setNow] = useState(() => performance.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  // Device wall time is not the consensus clock. Bound cache age instead and
  // confirm rollover against the contract, including immediately before signing.
  const stale = Boolean(data && now - data.checkedAt > 30_000);
  useEffect(() => {
    if (stale) void mutate();
  }, [stale, mutate]);

  const submit = async (functionName: "claim" | "registerPools" | "delegate", args: readonly unknown[]) => {
    if (!configured || !address || !credentialAddress) throw new Error(`${domain} credential contract is not configured for this network.`);
    setIsPending(true);
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
        expectedChainId: blockdagTestnet.id,
        contractVersion: "2.0.0",
        isPending,
        expectedGenesisHash: networkValidation.expectedGenesisHash,
      });
      if (boundaryReason) {
        throw new Error(boundaryReason);
      }
      await switchChain(wagmiAdapter.wagmiConfig, {
        chainId: blockdagTestnet.id,
        addEthereumChainParameter: { chainName: blockdagTestnet.name, nativeCurrency: blockdagTestnet.nativeCurrency, rpcUrls: [ENV.CHAIN.RPC_URL] },
      });
      const finalSnapshot = await networkValidation.readFresh();
      const finalBoundaryReason = getFreshWalletWriteBlockReason({
        action: "claim",
        snapshot: finalSnapshot,
        expectedAccount: address,
        expectedChainId: blockdagTestnet.id,
        contractVersion: "2.0.0",
        expectedGenesisHash: networkValidation.expectedGenesisHash,
        isPending,
      });
      if (finalBoundaryReason) throw new Error(finalBoundaryReason);
      if (functionName === "claim") {
        const currentEpoch = await readContractWithRetry<bigint>(wagmiAdapter.wagmiConfig, {
          address: credentialAddress as Address, abi: credentialAbi, functionName: "currentEpoch",
        } as unknown as Parameters<typeof readContract>[1], "Current voting period");
        if (currentEpoch !== args[0]) throw new Error("ClaimWindowClosed");
      }
      const { request } = await simulateContract(wagmiAdapter.wagmiConfig, { address: credentialAddress, abi: credentialAbi, functionName, args, account: address as Address, chain: blockdagTestnet } as unknown as Parameters<typeof simulateContract>[1]);
      const hash = await writeContract(wagmiAdapter.wagmiConfig, request);
      setLastHash(hash);
      const receipt = await waitForTransactionReceipt(wagmiAdapter.wagmiConfig, { chainId: blockdagTestnet.id, hash });
      if (receipt.status !== "success") throw new Error("Credential transaction reverted on-chain.");
      await mutate();
      toast({ title: "Voting update confirmed", description: "Your voting power has been refreshed." });
      return receipt;
    } catch (error) {
      const message = credentialErrorMessage(error);
      toast({ title: "Voting update not completed", description: message, variant: "destructive" });
      void mutate();
      throw new Error(message);
    } finally {
      setIsPending(false);
    }
  };

  const claim = (epoch: bigint, pools: Address[] = []) => submit("claim", [epoch, domain === "mining" ? [] : pools]);
  const registerPools = (pools: Address[]) => {
    if (domain !== "staking") throw new Error("Mining credentials do not register staking pools.");
    const sortedUniquePools = [...new Set(pools.map((pool) => pool.toLowerCase()))]
      .sort()
      .map((pool) => pool as Address);
    return submit("registerPools", [address as Address, sortedUniquePools]);
  };
  const delegate = (delegatee: Address) => submit("delegate", [delegatee]);

  return { domain, address: credentialAddress, configured, data: error || stale ? undefined : data, error: error instanceof Error ? error.message : error ? "Credential read failed." : stale ? "Current voting power needs a fresh chain check. Refreshing…" : null, isLoading, isPending, lastHash, claim, registerPools, delegate, refetch: mutate };
};
