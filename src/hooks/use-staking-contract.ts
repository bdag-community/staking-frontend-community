import { useCallback, useEffect, useRef, useState } from "react";
import {
  estimateGas,
  getBalance,
  getGasPrice,
  getTransactionCount,
  getTransaction,
  sendTransaction,
  switchChain,
  type WaitForTransactionReceiptReturnType,
  writeContract,
} from "@wagmi/core";
import { encodeFunctionData, formatEther, parseEther, maxUint256 } from "viem";
import { abi } from "@/contract/abi";
import { ENV } from "@/config/env";
import { useToast } from "./use-toast";
import { useWallet } from "./use-wallet";
import { formatNumber, getErrorMessage } from "@/lib/utils";
import { wagmiAdapter, blockdagTestnet } from "@/config/reown";
import {
  isUserRejectedContractError,
  simulateContractWithRetry,
  waitForTransactionReceiptWithRetry,
} from "@/utils/contract-calls";
import { stakingApi } from "@/lib/api";
import {
  createVisibilityAttemptId,
  getVisibilityErrorPayload,
  trackVisibilityEvent,
  VisibilityStage,
} from "@/lib/visibility";

import { useRefreshBalances } from "./use-refresh-balances";
import {
  resolveStakingContractAddress,
  type StakingContractVersion,
} from "@/lib/staking-contract";
import { getFreshWalletWriteBlockReason } from "@/lib/staking-boundaries";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";

export type StakingAction =
  | "stake"
  | "unstake"
  | "unstakeRewards"
  | "unstakeStake"
  | "claim"
  | "claimStake";

export type TransactionStatusState = {
  hash: `0x${string}`;
  attemptId?: string | null;
  nonce?: number;
  poolAddress?: string;
  action: StakingAction;
  status: "pending" | "stuck";
  backendStatus?:
    | "pending"
    | "stuck"
    | "missing"
    | "nonce_gap"
    | "replaced"
    | "confirmed"
    | "reverted";
  repairStatus?:
    | "checking"
    | "not_needed"
    | "skipped"
    | "unavailable"
    | "signature_required"
    | "submitted"
    | "confirmed"
    | "failed"
    | null;
  repairReason?: string | null;
  repairTxPlan?: RepairPlanTx[] | null;
  repairTxHashes?: { nonce: number; hash: string; kind: string }[] | null;
  updatedAt: number;
};

export type RepairPlanTx = {
  nonce: number;
  kind: "claim" | "cancel";
  to: `0x${string}`;
  data: `0x${string}`;
  value: string;
  gasLimit: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
};

type TrackedTransactionResponse = {
  txHash: string;
  stakerAddress: string;
  poolAddress?: string | null;
  nonce?: number | null;
  action?: string | null;
  status: NonNullable<TransactionStatusState["backendStatus"]>;
  repairStatus?: TransactionStatusState["repairStatus"];
  repairReason?: string | null;
  repairTxPlan?: RepairPlanTx[] | null;
  repairTxHashes?: { nonce: number; hash: string; kind: string }[] | null;
};

type UseStakingContractOptions = {
  checkNonceOnConnect?: boolean;
  version?: StakingContractVersion;
};

const STAKING_ACTIONS = new Set<StakingAction>([
  "stake",
  "unstake",
  "unstakeRewards",
  "unstakeStake",
  "claim",
  "claimStake",
]);

const normalizeTrackedAction = (action?: string | null): StakingAction =>
  action && STAKING_ACTIONS.has(action as StakingAction)
    ? (action as StakingAction)
    : "claimStake";

export const mapTrackedTransactionStatus = (
  tracked: TrackedTransactionResponse,
): TransactionStatusState | null => {
  if (!tracked || !/^0x[0-9a-fA-F]{64}$/.test(tracked.txHash ?? "")) return null;
  const hasRepairIssue =
    tracked.repairStatus !== null &&
    tracked.repairStatus !== undefined &&
    tracked.repairStatus !== "not_needed" &&
    tracked.repairStatus !== "confirmed";
  const isStuckStatus =
    tracked.status === "stuck" ||
    tracked.status === "missing" ||
    tracked.status === "nonce_gap";

  return {
    hash: tracked.txHash as `0x${string}`,
    nonce: tracked.nonce ?? undefined,
    poolAddress: tracked.poolAddress ?? undefined,
    action: normalizeTrackedAction(tracked.action),
    status: hasRepairIssue || isStuckStatus ? "stuck" : "pending",
    backendStatus: tracked.status,
    repairStatus: tracked.repairStatus,
    repairReason: tracked.repairReason,
    repairTxPlan: tracked.repairTxPlan,
    repairTxHashes: tracked.repairTxHashes,
    updatedAt: Date.now(),
  };
};

const getFailureTitle = (fallback: string, description: string) =>
  description.startsWith("Transaction submitted")
    ? "Confirmation Pending"
    : fallback;

export const MIN_STAKING_GAS_PRICE_WEI = 500_000_000n;
export const STAKING_GAS_PRICE_MULTIPLIER = 2n;
export const STAKE_GAS_FALLBACK_LIMIT = 600_000n;
export const DEFAULT_STAKE_NETWORK_FEE_WEI =
  MIN_STAKING_GAS_PRICE_WEI * STAKE_GAS_FALLBACK_LIMIT;
const TRACKED_TX_POLL_INTERVAL_MS = 5000;
const TRACKED_TX_POLL_ATTEMPTS = 120;

const getChainSwitchParams = () => ({
  chainId: blockdagTestnet.id,
  addEthereumChainParameter: {
    chainName: blockdagTestnet.name,
    nativeCurrency: blockdagTestnet.nativeCurrency,
    rpcUrls: [ENV.CHAIN.RPC_URL],
    blockExplorerUrls: ENV.CHAIN.BLOCK_EXPLORER_URL
      ? [ENV.CHAIN.BLOCK_EXPLORER_URL]
      : undefined,
  },
});

const getBufferedFees = async () => {
  let fee = MIN_STAKING_GAS_PRICE_WEI;

  try {
    const gasPrice = await getGasPrice(wagmiAdapter.wagmiConfig, {
      chainId: blockdagTestnet.id,
    });
    const bufferedGasPrice = gasPrice * STAKING_GAS_PRICE_MULTIPLIER;
    fee =
      bufferedGasPrice > MIN_STAKING_GAS_PRICE_WEI
        ? bufferedGasPrice
        : MIN_STAKING_GAS_PRICE_WEI;
  } catch (err) {
    console.warn("Unable to estimate gas price; using staking minimum.", err);
  }

  return {
    maxFeePerGas: fee,
    maxPriorityFeePerGas: fee,
  };
};

export const getEstimatedStakeNetworkFee = async () => {
  const fees = await getBufferedFees();
  return fees.maxFeePerGas * STAKE_GAS_FALLBACK_LIMIT;
};

type StakeBalanceCheck = {
  balance: bigint;
  stakeAmount: bigint;
  estimatedNetworkFee: bigint;
  totalRequired: bigint;
  maxStakeAmount: bigint;
};

class InsufficientStakeBalanceError extends Error {
  public readonly code = "INSUFFICIENT_STAKE_BALANCE";
  public readonly shortMessage: string;
  public readonly details: StakeBalanceCheck;

  constructor(details: StakeBalanceCheck) {
    const formatBdag = (value: bigint, decimals = 6) =>
      `${formatNumber(formatEther(value), decimals)} BDAG`;
    const maxStakeText =
      details.maxStakeAmount > 0n
        ? ` You can stake up to ${formatBdag(details.maxStakeAmount)} with the current fee estimate.`
        : " Add BDAG to your wallet before staking.";

    const message =
      `You do not have enough BDAG for this stake plus the network fee. ` +
      `Wallet balance: ${formatBdag(details.balance)}. ` +
      `Stake amount: ${formatBdag(details.stakeAmount)}. ` +
      `Estimated network fee: ${formatBdag(details.estimatedNetworkFee)}. ` +
      `Total required: ${formatBdag(details.totalRequired)}.` +
      maxStakeText;

    super(message);
    this.name = "InsufficientStakeBalanceError";
    this.shortMessage = message;
    this.details = details;
  }
}

const getStakeGasLimit = async (
  account: `0x${string}`,
  poolAddress: `0x${string}`,
  value: bigint,
  fees: Awaited<ReturnType<typeof getBufferedFees>>,
  contractAddress: `0x${string}`,
) => {
  try {
    const gas = await estimateGas(wagmiAdapter.wagmiConfig, {
      account,
      chainId: blockdagTestnet.id,
      to: contractAddress,
      data: encodeFunctionData({
        abi,
        functionName: "stake",
        args: [account, value, poolAddress],
      }),
      value,
      ...fees,
    } as EstimateGasParams);

    return (gas * 12n) / 10n;
  } catch {
    return STAKE_GAS_FALLBACK_LIMIT;
  }
};

const assertStakeBalance = async (
  account: `0x${string}`,
  poolAddress: `0x${string}`,
  stakeAmount: bigint,
  fees: Awaited<ReturnType<typeof getBufferedFees>>,
  contractAddress: `0x${string}`,
) => {
  const [{ value: balance }, gasLimit] = await Promise.all([
    getBalance(wagmiAdapter.wagmiConfig, {
      address: account,
      chainId: blockdagTestnet.id,
    }),
    getStakeGasLimit(account, poolAddress, stakeAmount, fees, contractAddress),
  ]);

  const estimatedNetworkFee = gasLimit * fees.maxFeePerGas;
  const totalRequired = stakeAmount + estimatedNetworkFee;

  if (balance >= totalRequired) return;

  throw new InsufficientStakeBalanceError({
    balance,
    stakeAmount,
    estimatedNetworkFee,
    totalRequired,
    maxStakeAmount:
      balance > estimatedNetworkFee ? balance - estimatedNetworkFee : 0n,
  });
};

const getPendingNonce = (address: `0x${string}`) =>
  getTransactionCount(wagmiAdapter.wagmiConfig, {
    address,
    blockTag: "pending",
    chainId: blockdagTestnet.id,
  });

const getErrorText = (error: unknown): string => {
  if (!error || typeof error !== "object") return "";

  const err = error as {
    name?: string;
    message?: string;
    shortMessage?: string;
    details?: string;
    cause?: unknown;
  };

  return [
    err.name,
    err.shortMessage,
    err.message,
    err.details,
    getErrorText(err.cause),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

const isConfirmationTimeout = (error: unknown) => {
  const text = getErrorText(error);
  return (
    text.includes("transaction confirmation") &&
    (text.includes("timeout") ||
      text.includes("timed out") ||
      text.includes("taking longer"))
  );
};

const isNonceTooLowError = (error: unknown) => {
  const text = getErrorText(error);
  return (
    text.includes("nonce") &&
    (text.includes("too low") ||
      text.includes("lower than the current nonce") ||
      text.includes("nonce provided for the tx is lower"))
  );
};

const normalizeError = (error: unknown) =>
  error instanceof Error ? error : new Error(getErrorMessage(error));

const parseBdagAmount = (amount?: string) => {
  if (!amount) return 0n;
  return parseEther(amount);
};

const buildRewardUnstakeRequests = (
  pools: {
    poolAddress: string;
    stakedAmount: string;
    rewardAmount?: string;
  }[],
  isMax?: boolean,
  customTotalAmount?: string,
) => {
  const rewardPools = pools
    .map((pool) => ({
      poolAddress: pool.poolAddress as `0x${string}`,
      rewardAmount: parseBdagAmount(pool.rewardAmount),
    }))
    .filter((pool) => pool.rewardAmount > 0n);

  let remainingAmount = isMax
    ? rewardPools.reduce((total, pool) => total + pool.rewardAmount, 0n)
    : parseBdagAmount(customTotalAmount);

  const requests: { poolAddress: `0x${string}`; amount: bigint }[] = [];
  for (const pool of rewardPools) {
    if (remainingAmount === 0n) break;

    const amount = pool.rewardAmount < remainingAmount
      ? pool.rewardAmount
      : remainingAmount;
    requests.push({ poolAddress: pool.poolAddress, amount });
    remainingAmount -= amount;
  }

  return requests;
};

type ContractWriteParams = Parameters<typeof writeContract>[1];
type ContractSimulationParams = Parameters<typeof simulateContractWithRetry>[1];
type EstimateGasParams = Parameters<typeof estimateGas>[1];
type SendTransactionParams = Parameters<typeof sendTransaction>[1];

export const useStakingContract = ({
  checkNonceOnConnect = false,
  version = "current",
}: UseStakingContractOptions = {}) => {
  const { address: userAddress, chainId } = useWallet();
  const contractAddress = resolveStakingContractAddress(version);
  const { toast } = useToast();
  const { refreshWithIntervals } = useRefreshBalances();
  const networkValidation = useWalletNetworkValidation();

  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingAction, setPendingAction] = useState<StakingAction | null>(
    null,
  );
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionStatusState | null>(null);
  const [isRepairing, setIsRepairing] = useState(false);
  const inFlightActionRef = useRef<string | null>(null);
  const visibilityAttemptIdRef = useRef<string | null>(null);
  const actionStartedAtRef = useRef<number | null>(null);
  const nonceRepairCheckAddressRef = useRef<string | null>(null);

  const getActionDurationMs = () => {
    if (!actionStartedAtRef.current) return null;
    return Math.round(performance.now() - actionStartedAtRef.current);
  };

  const recordVisibility = (
    action: StakingAction,
    stage: VisibilityStage,
    data?: Partial<Parameters<typeof trackVisibilityEvent>[0]>,
  ) => {
    trackVisibilityEvent({
      attemptId: visibilityAttemptIdRef.current,
      action,
      stage,
      stakerAddress: userAddress ?? null,
      durationMs: getActionDurationMs(),
      ...data,
    });
  };

  const getTransactionNonce = async (txHash: `0x${string}`) => {
    try {
      const tx = await getTransaction(wagmiAdapter.wagmiConfig, {
        chainId: blockdagTestnet.id,
        hash: txHash,
      });
      return tx.nonce;
    } catch {
      return undefined;
    }
  };

  const trackTransaction = (
    status: TransactionStatusState,
    stakerAddress: `0x${string}`,
  ) => {
    void stakingApi.post("/transactions/track", {
      attemptId: status.attemptId,
      txHash: status.hash,
      stakerAddress,
      poolAddress: status.poolAddress,
      nonce: status.nonce,
      action: status.action,
      status: status.status,
    });
  };

  const pollTrackedTransaction = useCallback(
    async (
      txHash: `0x${string}`,
      fallbackStatus: TransactionStatusState,
    ) => {
      for (let attempt = 0; attempt < TRACKED_TX_POLL_ATTEMPTS; attempt++) {
        await new Promise((resolve) =>
          window.setTimeout(resolve, TRACKED_TX_POLL_INTERVAL_MS),
        );

        const response = await stakingApi.get<TrackedTransactionResponse>(
          `/transactions/${txHash}`,
        );
        const tracked = response.data;
        if (!response.success || !tracked) continue;

        setTransactionStatus((current) => {
          if (!current || current.hash !== txHash) return current;

          return {
            ...fallbackStatus,
            ...current,
            backendStatus: tracked.status,
            repairStatus: tracked.repairStatus,
            repairReason: tracked.repairReason,
            repairTxPlan: tracked.repairTxPlan,
            repairTxHashes: tracked.repairTxHashes,
            updatedAt: Date.now(),
          };
        });

        if (
          tracked.status === "confirmed" ||
          tracked.status === "reverted" ||
          tracked.status === "replaced"
        ) {
          if (tracked.status === "confirmed" || tracked.status === "replaced") {
            refreshWithIntervals();
          }
          return;
        }

        if (
          tracked.repairStatus === "failed" ||
          tracked.repairStatus === "unavailable" ||
          tracked.repairStatus === "skipped" ||
          tracked.repairStatus === "not_needed" ||
          tracked.repairStatus === "signature_required"
        ) {
          return;
        }
      }
    },
    [refreshWithIntervals],
  );

  useEffect(() => {
    if (!checkNonceOnConnect) return;
    if (!userAddress) {
      nonceRepairCheckAddressRef.current = null;
      return;
    }

    const addressKey = userAddress.toLowerCase();
    if (nonceRepairCheckAddressRef.current === addressKey) return;
    nonceRepairCheckAddressRef.current = addressKey;

    let cancelled = false;

    const checkNonceRepair = async () => {
      const response = await stakingApi.get<TrackedTransactionResponse>(
        `/transactions/nonce-repair/${userAddress}`,
      );

      if (cancelled || !response.success || !response.data) return;

      const nextStatus = mapTrackedTransactionStatus(response.data);
      if (!nextStatus || nextStatus.repairStatus === "not_needed") return;

      setTransactionStatus((current) => current ?? nextStatus);

      if (
        nextStatus.repairStatus === "checking" ||
        nextStatus.repairStatus === "submitted"
      ) {
        void pollTrackedTransaction(nextStatus.hash, nextStatus);
      }
    };

    void checkNonceRepair();

    return () => {
      cancelled = true;
    };
  }, [checkNonceOnConnect, pollTrackedTransaction, userAddress]);

  const handleTransaction = async (
    txHash: `0x${string}`,
    action: StakingAction,
    account: `0x${string}`,
    poolAddress?: string,
  ) => {
    setHash(txHash);
    setIsConfirming(true);
    const attemptId = visibilityAttemptIdRef.current;
    const submittedStatus: TransactionStatusState = {
      hash: txHash,
      attemptId,
      nonce: await getTransactionNonce(txHash),
      poolAddress,
      action,
      status: "pending",
      updatedAt: Date.now(),
    };
    setTransactionStatus(submittedStatus);
    recordVisibility(action, "tx_submitted", {
      attemptId,
      success: true,
      txHash,
      poolAddress,
      nonce: submittedStatus.nonce,
      metadata: { source: "frontend" },
    });
    trackTransaction(submittedStatus, account);

    let terminalFailureRecorded = false;
    try {
      const receipt =
        await waitForTransactionReceiptWithRetry<WaitForTransactionReceiptReturnType>(
          wagmiAdapter.wagmiConfig,
          { hash: txHash },
        );
      if (receipt.status === "success") {
        setIsSuccess(true);
        setTransactionStatus(null);
        recordVisibility(action, "confirmed", {
          attemptId,
          success: true,
          txHash,
          poolAddress,
          nonce: submittedStatus.nonce,
          blockNumber: Number(receipt.blockNumber),
          metadata: { source: "frontend" },
        });
        refreshWithIntervals();
        return receipt;
      }

      setTransactionStatus(null);
      const revertError = new Error("Transaction reverted on-chain.");
      setError(revertError);
      recordVisibility(action, "reverted", {
        attemptId,
        success: false,
        txHash,
        poolAddress,
        nonce: submittedStatus.nonce,
        blockNumber: Number(receipt.blockNumber),
        ...getVisibilityErrorPayload(revertError),
        metadata: { source: "frontend" },
      });
      terminalFailureRecorded = true;
      throw revertError;
    } catch (err: unknown) {
      setError(normalizeError(err));
      if (terminalFailureRecorded) throw err;
      if (isConfirmationTimeout(err)) {
        const stuckStatus: TransactionStatusState = {
          ...submittedStatus,
          status: "stuck",
          repairStatus: "checking",
          repairReason: "Checking whether low gas is blocking this nonce.",
          updatedAt: Date.now(),
        };
        setTransactionStatus(stuckStatus);
        trackTransaction(stuckStatus, account);
        recordVisibility(action, "stuck", {
          attemptId,
          success: false,
          txHash,
          poolAddress,
          nonce: submittedStatus.nonce,
          ...getVisibilityErrorPayload(err),
          metadata: { source: "frontend" },
        });
        void pollTrackedTransaction(txHash, stuckStatus);
      } else {
        setTransactionStatus(null);
        recordVisibility(action, "failed", {
          attemptId,
          success: false,
          txHash,
          poolAddress,
          nonce: submittedStatus.nonce,
          ...getVisibilityErrorPayload(err),
          metadata: { source: "frontend" },
        });
      }
      throw err;
    } finally {
      setIsConfirming(false);
    }
  };

  const ensureWriteChain = async () => {
    await switchChain(wagmiAdapter.wagmiConfig, getChainSwitchParams());
  };

  const ensureWriteBoundary = async (action: "stake" | "unstake" | "claim") => {
    if (action === "stake" && ENV.LEGACY_ONLY) throw new Error("Legacy staking is exit-only. New deposits are disabled.");
    let snapshot;
    try {
      snapshot = await networkValidation.readFresh();
    } catch {
      const reason = "Unable to verify the connected wallet network immediately before signing.";
      toast({ title: "Network verification unavailable", description: reason, variant: "destructive" });
      throw new Error(reason);
    }
    const reason = getFreshWalletWriteBlockReason({
      action,
      snapshot,
      expectedAccount: userAddress,
      expectedChainId: blockdagTestnet.id,
      contractVersion: version === "v1" ? "1.0.0" : "2.0.0",
      expectedGenesisHash: networkValidation.expectedGenesisHash,
      isPending,
    });
    if (!reason) return;
    const error = new Error(reason);
    toast({ title: "Wrong network", description: reason, variant: "destructive" });
    throw error;
  };

  const beginAction = (action: StakingAction) => {
    if (!userAddress || inFlightActionRef.current) return null;

    inFlightActionRef.current = `${userAddress.toLowerCase()}:${action}`;
    visibilityAttemptIdRef.current = createVisibilityAttemptId();
    actionStartedAtRef.current = performance.now();
    setIsPending(true);
    setPendingAction(action);
    setIsSuccess(false);
    setError(null);
    setTransactionStatus(null);
    recordVisibility(action, "started", {
      success: true,
      metadata: { source: "frontend" },
    });

    return userAddress as `0x${string}`;
  };

  const finishAction = () => {
    setTimeout(() => {
      inFlightActionRef.current = null;
      visibilityAttemptIdRef.current = null;
      actionStartedAtRef.current = null;
      setIsPending(false);
      setPendingAction(null);
    }, 2000);
  };

  const showTransactionErrorToast = (fallbackTitle: string, err: unknown) => {
    const description = getErrorMessage(err);
    toast({
      title: getFailureTitle(fallbackTitle, description),
      description,
      variant: isConfirmationTimeout(err) ? undefined : "destructive",
    });
  };

  const getPreSubmitFailureStage = (
    fallbackStage: VisibilityStage,
    err: unknown,
  ): VisibilityStage =>
    isUserRejectedContractError(err) ? "wallet_rejected" : fallbackStage;

  const recordPreSubmitFailure = (
    action: StakingAction,
    fallbackStage: VisibilityStage,
    err: unknown,
    data?: Partial<Parameters<typeof trackVisibilityEvent>[0]>,
  ) => {
    recordVisibility(action, getPreSubmitFailureStage(fallbackStage, err), {
      success: false,
      ...getVisibilityErrorPayload(err),
      metadata: { source: "frontend" },
      ...data,
    });
  };

  const applyNonceRepair = async () => {
    if (!userAddress || !transactionStatus?.repairTxPlan?.length) return;
    if (transactionStatus.repairStatus !== "signature_required") return;

    const originalStatus = transactionStatus;
    setIsRepairing(true);
    const repairTxHashes: { nonce: number; hash: string; kind: string }[] = [];

    const submitRepairHashes = async (
      hashes: { nonce: number; hash: string; kind: string }[],
      reason: string,
      toastTitle: string,
      toastDescription: string,
    ) => {
      await stakingApi.post(`/transactions/${originalStatus.hash}/repair`, {
        repairTxHashes: hashes,
      });

      const submittedStatus: TransactionStatusState = {
        ...originalStatus,
        repairStatus: "submitted",
        repairReason: reason,
        repairTxHashes: hashes,
        updatedAt: Date.now(),
      };
      setTransactionStatus(submittedStatus);
      void pollTrackedTransaction(originalStatus.hash, submittedStatus);

      toast({
        title: toastTitle,
        description: toastDescription,
      });
    };

    try {
      await ensureWriteBoundary("claim");
      await ensureWriteChain();
      // Re-read the selected wallet provider after any chain switch and immediately before simulation.
      await ensureWriteBoundary("claim");
      const account = userAddress as `0x${string}`;
      const repairTxs = [...originalStatus.repairTxPlan].sort(
        (a, b) => a.nonce - b.nonce,
      );
      let pendingNonce = await getPendingNonce(account);

      for (const tx of repairTxs) {
        if (tx.nonce < pendingNonce) {
          continue;
        }

        const repairHash = await sendTransaction(wagmiAdapter.wagmiConfig, {
          account,
          chain: blockdagTestnet,
          to: tx.to,
          data: tx.data,
          value: BigInt(tx.value),
          nonce: tx.nonce,
          gas: BigInt(tx.gasLimit),
          maxFeePerGas: BigInt(tx.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas),
        } as SendTransactionParams);

        repairTxHashes.push({
          nonce: tx.nonce,
          hash: repairHash,
          kind: tx.kind,
        });
        pendingNonce = Math.max(pendingNonce, tx.nonce + 1);
      }

      if (repairTxHashes.length === 0) {
        const refreshedStatus: TransactionStatusState = {
          ...originalStatus,
          repairStatus: "checking",
          repairReason:
            "Wallet nonce already advanced past the planned repair transaction. Refreshing transaction status.",
          updatedAt: Date.now(),
        };
        setTransactionStatus(refreshedStatus);
        void pollTrackedTransaction(originalStatus.hash, refreshedStatus);

        toast({
          title: "Nonce Repair Skipped",
          description:
            "Your wallet nonce is already ahead of the repair plan, so no replacement transaction was needed.",
        });
        return;
      }

      await submitRepairHashes(
        repairTxHashes,
        "Connected wallet submitted nonce replacement transactions.",
        "Nonce Repair Submitted",
        "Replacement transaction(s) were signed by your wallet and sent to the network.",
      );
    } catch (err: unknown) {
      if (isNonceTooLowError(err)) {
        if (repairTxHashes.length > 0) {
          await submitRepairHashes(
            repairTxHashes,
            "Partial nonce repair submitted before wallet nonce advanced.",
            "Partial Nonce Repair Submitted",
            "Some replacement transactions were sent before your wallet nonce advanced. Tracking submitted repairs.",
          );
          return;
        }

        const refreshedStatus: TransactionStatusState = {
          ...originalStatus,
          repairStatus: "checking",
          repairReason:
            "Wallet nonce advanced while signing the repair transaction. Refreshing transaction status.",
          updatedAt: Date.now(),
        };
        setTransactionStatus(refreshedStatus);
        void pollTrackedTransaction(originalStatus.hash, refreshedStatus);

        toast({
          title: "Nonce Repair Skipped",
          description:
            "Your wallet nonce is already ahead of the repair plan, so no replacement transaction was needed.",
        });
        return;
      }

      setError(normalizeError(err));
      showTransactionErrorToast("Nonce Repair Failed", err);
      throw err;
    } finally {
      setIsRepairing(false);
    }
  };

  const stake = async (poolAddress: string, amount: string) => {
    const account = beginAction("stake");
    if (!account) return;

    let failureStage: VisibilityStage = "failed";
    let txSubmitted = false;
    let amountRaw: string | null = null;

    try {
      await ensureWriteBoundary("stake");
      await ensureWriteChain();
      // Re-read the selected wallet provider after any chain switch and immediately before simulation.
      await ensureWriteBoundary("stake");
      const fees = await getBufferedFees();
      const parsedAmount = parseEther(amount);
      amountRaw = parsedAmount.toString();
      await assertStakeBalance(
        account,
        poolAddress as `0x${string}`,
        parsedAmount,
        fees,
        contractAddress,
      );

      failureStage = "simulation_failed";
      const { request } = await simulateContractWithRetry(
        wagmiAdapter.wagmiConfig,
        {
          address: contractAddress,
          abi,
          functionName: "stake",
          args: [
            account,
            parsedAmount,
            poolAddress as `0x${string}`,
          ],
          value: parsedAmount,
          account,
          chainId: blockdagTestnet.id,
          ...fees,
        } as ContractSimulationParams,
        "Stake preparation",
      );
      recordVisibility("stake", "simulation_succeeded", {
        success: true,
        poolAddress,
        amountRaw,
        amountFormatted: amount,
        metadata: { source: "frontend" },
      });

      failureStage = "failed";
      const txHash = await writeContract(
        wagmiAdapter.wagmiConfig,
        request as ContractWriteParams
      );
      txSubmitted = true;

      const receipt = await handleTransaction(
        txHash,
        "stake",
        account,
        poolAddress,
      );
      if (receipt && receipt.status === "success") {
        toast({
          title: "Staking Successful",
          description: `Successfully staked ${formatNumber(amount, 2)} BDAG in the pool.`,
        });
      }
      return receipt;
    } catch (err: unknown) {
      setError(normalizeError(err));
      if (!txSubmitted) {
        recordPreSubmitFailure("stake", failureStage, err, {
          poolAddress,
          amountRaw,
          amountFormatted: amount,
        });
      }
      showTransactionErrorToast(
        err instanceof InsufficientStakeBalanceError
          ? "Insufficient BDAG"
          : "Staking Failed",
        err,
      );
      throw err;
    } finally {
      finishAction();
    }
  };

  const unstake = async (
    poolAddress: string,
    amount: string,
    isMax?: boolean
  ) => {
    const account = beginAction("unstake");
    if (!account) return;

    let failureStage: VisibilityStage = "failed";
    let txSubmitted = false;
    let amountRaw: string | null = null;

    try {
      await ensureWriteBoundary("unstake");
      await ensureWriteChain();
      // Re-read the selected wallet provider after any chain switch and immediately before simulation.
      await ensureWriteBoundary("unstake");
      const fees = await getBufferedFees();
      const parsedAmount = isMax ? maxUint256 : parseEther(amount);
      amountRaw = parsedAmount.toString();

      failureStage = "simulation_failed";
      const { request } = await simulateContractWithRetry(
        wagmiAdapter.wagmiConfig,
        {
          address: contractAddress,
          abi,
          functionName: "unstake",
          args: [
            account,
            parsedAmount,
            [poolAddress as `0x${string}`],
          ],
          account,
          chainId: blockdagTestnet.id,
          ...fees,
        } as ContractSimulationParams,
        "Unstake preparation",
      );
      recordVisibility("unstake", "simulation_succeeded", {
        success: true,
        poolAddress,
        amountRaw,
        amountFormatted: isMax ? "max" : amount,
        metadata: { source: "frontend" },
      });

      failureStage = "failed";
      const txHash = await writeContract(
        wagmiAdapter.wagmiConfig,
        request as ContractWriteParams
      );
      txSubmitted = true;
      const receipt = await handleTransaction(
        txHash,
        "unstake",
        account,
        poolAddress,
      );
      if (receipt && receipt.status === "success") {
        toast({
          title: "Unstake Successful",
          description: isMax
            ? "Successfully unstaked all tokens from the pool."
            : `Successfully unstaked ${formatNumber(amount, 2)} BDAG from the pool.`,
        });
      }
      return receipt;
    } catch (err: unknown) {
      setError(normalizeError(err));
      if (!txSubmitted) {
        recordPreSubmitFailure("unstake", failureStage, err, {
          poolAddress,
          amountRaw,
          amountFormatted: isMax ? "max" : amount,
        });
      }
      showTransactionErrorToast("Unstaking Failed", err);
      throw err;
    } finally {
      finishAction();
    }
  };

  // claimStake pays out all matured unbonding for the staker; poolAddress is only
  // used for operator auto-stake rewards when stakerAddress == poolAddress.
  const claim = async (
    poolAddress: string,
    action: Extract<StakingAction, "claim" | "claimStake"> = "claim",
  ) => {
    const account = beginAction(action);
    if (!account) return;

    let failureStage: VisibilityStage = "failed";
    let txSubmitted = false;

    try {
      await ensureWriteBoundary("claim");
      await ensureWriteChain();
      // Re-read the selected wallet provider after any chain switch and immediately before simulation.
      await ensureWriteBoundary("claim");
      const fees = await getBufferedFees();

      failureStage = "simulation_failed";
      const { request } = await simulateContractWithRetry(
        wagmiAdapter.wagmiConfig,
        {
          address: contractAddress,
          abi,
          functionName: "claimStake",
          args: [account, poolAddress as `0x${string}`],
          account,
          chainId: blockdagTestnet.id,
          gas: BigInt(500000),
          ...fees,
        } as ContractSimulationParams,
        "Claim preparation",
      );
      recordVisibility(action, "simulation_succeeded", {
        success: true,
        poolAddress,
        metadata: { source: "frontend" },
      });

      failureStage = "failed";
      const txHash = await writeContract(
        wagmiAdapter.wagmiConfig,
        request as ContractWriteParams
      );
      txSubmitted = true;
      const receipt = await handleTransaction(
        txHash,
        action,
        account,
        poolAddress,
      );
      if (receipt && receipt.status === "success") {
        toast({
          title: action === "claimStake" ? "Unstaked Stake Claimed" : "Rewards Claimed",
          description:
            action === "claimStake"
              ? "Successfully claimed your unstaked BDAG."
              : "Successfully claimed your staking rewards.",
        });
      }
      return receipt;
    } catch (err: unknown) {
      setError(normalizeError(err));
      if (!txSubmitted) {
        recordPreSubmitFailure(action, failureStage, err, { poolAddress });
      }
      showTransactionErrorToast("Claim Failed", err);
      throw err;
    } finally {
      finishAction();
    }
  };

  const unstakeAll = async (
    pools: {
      poolAddress: string;
      stakedAmount: string;
      rewardAmount?: string;
    }[],
    isMax?: boolean,
    customTotalAmount?: string,
    action: StakingAction = "unstake"
  ) => {
    if (pools.length === 0) return;

    const account = beginAction(action);
    if (!account) return;

    if (action === "unstakeRewards") {
      const requests = buildRewardUnstakeRequests(
        pools,
        isMax,
        customTotalAmount,
      );

      if (requests.length === 0) {
        finishAction();
        return;
      }

      let completedAmount = 0n;
      let completedTransactions = 0;
      let failureStage: VisibilityStage = "failed";
      let currentRequest:
        | { poolAddress: `0x${string}`; amount: bigint }
        | undefined;
      let currentTxSubmitted = false;

      try {
        await ensureWriteBoundary("unstake");
        await ensureWriteChain();
        // Re-read the selected wallet provider after any chain switch and immediately before simulation.
        await ensureWriteBoundary("unstake");

        for (const requestItem of requests) {
          currentRequest = requestItem;
          currentTxSubmitted = false;
          const fees = await getBufferedFees();
          failureStage = "simulation_failed";
          const { request } = await simulateContractWithRetry(
            wagmiAdapter.wagmiConfig,
            {
              address: contractAddress,
              abi,
              functionName: "unstake",
              args: [
                account,
                requestItem.amount,
                [requestItem.poolAddress],
              ],
              account,
              chainId: blockdagTestnet.id,
              ...fees,
            } as unknown as ContractSimulationParams,
            "Reward unstake preparation",
          );
          recordVisibility(action, "simulation_succeeded", {
            success: true,
            poolAddress: requestItem.poolAddress,
            amountRaw: requestItem.amount.toString(),
            amountFormatted: formatEther(requestItem.amount),
            metadata: { source: "frontend" },
          });

          failureStage = "failed";
          const txHash = await writeContract(
            wagmiAdapter.wagmiConfig,
            request as ContractWriteParams,
          );
          currentTxSubmitted = true;
          await handleTransaction(
            txHash,
            action,
            account,
            requestItem.poolAddress,
          );

          completedTransactions += 1;
          completedAmount += requestItem.amount;
          currentRequest = undefined;
          currentTxSubmitted = false;
        }

        toast({
          title: "Rewards Unstaked",
          description:
            requests.length === 1
              ? `Successfully unstaked ${formatNumber(formatEther(completedAmount), 2)} BDAG of rewards.`
              : `Successfully unstaked ${formatNumber(formatEther(completedAmount), 2)} BDAG of rewards across ${requests.length} pools.`,
        });

        return;
      } catch (err: unknown) {
        setError(err instanceof Error ? err : new Error(getErrorMessage(err)));
        if (!currentTxSubmitted) {
          recordPreSubmitFailure(action, failureStage, err, {
            poolAddress: currentRequest?.poolAddress,
            amountRaw: currentRequest?.amount.toString(),
            amountFormatted: currentRequest
              ? formatEther(currentRequest.amount)
              : undefined,
            metadata: {
              source: "frontend",
              completedTransactions,
              requestedTransactions: requests.length,
            },
          });
        }
        if (completedTransactions > 0) {
          toast({
            title: "Reward Unstake Partially Completed",
            description: `${completedTransactions} of ${requests.length} reward unstake transactions completed before the next transaction failed.`,
            variant: "destructive",
          });
        } else {
          showTransactionErrorToast("Reward Unstake Failed", err);
        }
        throw err;
      } finally {
        finishAction();
      }
    }

    const totalAmount = isMax
      ? maxUint256
      : parseEther(customTotalAmount || "0");

    const poolAddresses = pools
      .filter(
        (pool) =>
          Number(pool.stakedAmount) > 0 || Number(pool.rewardAmount || 0) > 0
      )
      .map((pool) => pool.poolAddress as `0x${string}`);

    let failureStage: VisibilityStage = "failed";
    let txSubmitted = false;

    try {
      await ensureWriteBoundary("unstake");
      await ensureWriteChain();
      // Re-read the selected wallet provider after any chain switch and immediately before simulation.
      await ensureWriteBoundary("unstake");
      const fees = await getBufferedFees();

      failureStage = "simulation_failed";
      const { request } = await simulateContractWithRetry(
        wagmiAdapter.wagmiConfig,
        {
          address: contractAddress,
          abi,
          functionName: "unstake",
          args: [account, totalAmount, poolAddresses],
          account,
          chainId: blockdagTestnet.id,
          ...fees,
        } as ContractSimulationParams,
        "Unstake preparation",
      );
      recordVisibility(action, "simulation_succeeded", {
        success: true,
        poolAddress: poolAddresses[0],
        amountRaw: totalAmount.toString(),
        amountFormatted: isMax ? "max" : customTotalAmount || "0",
        metadata: {
          source: "frontend",
          poolCount: poolAddresses.length,
        },
      });

      failureStage = "failed";
      const txHash = await writeContract(
        wagmiAdapter.wagmiConfig,
        request as ContractWriteParams
      );
      txSubmitted = true;
      const receipt = await handleTransaction(
        txHash,
        action,
        account,
        poolAddresses[0],
      );

      if (receipt && receipt.status === "success") {
        toast({
          title: "Unstake All Successful",
          description: isMax
            ? "Successfully unstaked all tokens."
            : `Successfully unstaked ${formatNumber(customTotalAmount, 2)} BDAG.`,
        });
      }

      return receipt;
    } catch (err: unknown) {
      setError(normalizeError(err));
      if (!txSubmitted) {
        recordPreSubmitFailure(action, failureStage, err, {
          poolAddress: poolAddresses[0],
          amountRaw: totalAmount.toString(),
          amountFormatted: isMax ? "max" : customTotalAmount || "0",
          metadata: {
            source: "frontend",
            poolCount: poolAddresses.length,
          },
        });
      }
      showTransactionErrorToast("Unstake All Failed", err);
      throw err;
    } finally {
      finishAction();
    }
  };

  return {
    stake,
    unstake,
    claim,
    unstakeAll,
    hash,
    error,
    transactionStatus,
    applyNonceRepair,
    isRepairing,
    isPending,
    isConfirming,
    pendingAction,
    isSuccess,
    setIsSuccess,
  };
};
