import React, { useCallback, useEffect, useId, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { formatEther, parseEther } from "viem";
import {
  AlertCircle,
  Info,
  Clock,
  Percent,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoTooltip } from "./InfoTooltip";
import {
  DEFAULT_STAKE_NETWORK_FEE_WEI,
  getEstimatedStakeNetworkFee,
  useStakingContract,
} from "@/hooks/use-staking-contract";
import { useWallet } from "@/hooks/use-wallet";
import { cn, formatNumber, truncatedHash } from "@/lib/utils";
import { CopyButton } from "./copy-button";
import { ConfirmingOverlay } from "./confirming-overlay";
import { TransactionStatusNotice } from "./transaction-status-notice";
import { useTotalStaked } from "@/hooks/use-total-staked";
import { useLowestPool } from "@/hooks/use-lowest-pool";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { useContractVersion } from "@/hooks/use-contract-version";
import { ENV } from "@/config/env";
import { ExplorerLink } from "./explorer-link";
import { blockdagTestnet } from "@/config/reown";
import { getStakingActionBlockReason } from "@/lib/staking-boundaries";
import { StakeBoundaryStatus } from "@/components/ui/stake-boundary-status";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";

interface StakeModalProps {
  pool?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StakeModal: React.FC<StakeModalProps> = ({
  pool,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const amountInputId = useId();
  const location = useLocation();
  const isOnPortfolio = location.pathname === "/portfolio";
  const {
    stake: contractStake,
    isPending: isContractStaking,
    isConfirming,
    hash,
    isSuccess,
    setIsSuccess,
    transactionStatus,
    applyNonceRepair,
    isRepairing,
  } = useStakingContract();
  const { refetch: refetchTotalStaked } = useTotalStaked();
  const [amount, setAmount] = useState("");
  const [stakeNetworkFeeRaw, setStakeNetworkFeeRaw] = useState(
    DEFAULT_STAKE_NETWORK_FEE_WEI,
  );
  const { isConnected, balanceData } = useWallet();
  const { lowestPoolApy, lowestPool } = useLowestPool();
  const { formatted: stakingPeriodLabels } = useStakingPeriods();
  const { minStake, version } = useContractVersion();
  const { chainId } = useWallet();
  const networkValidation = useWalletNetworkValidation();
  const targetPool = pool || lowestPool?.poolAddress;

  // const weeklyReward = calculateEstimatedWeeklyReward(numAmount);
  // const afterCommission = pool ? weeklyReward * (1 - pool.commission / 100) : 0;
  // const yearlyEstimate = afterCommission * 52;
  const numAmount = parseFloat(amount) || 0;
  const amountRaw = useMemo(() => {
    try {
      return amount ? parseEther(amount) : 0n;
    } catch {
      return 0n;
    }
  }, [amount]);
  const walletBalanceRaw = balanceData?.value ?? 0n;
  const maxStakeRaw =
    walletBalanceRaw > stakeNetworkFeeRaw
      ? walletBalanceRaw - stakeNetworkFeeRaw
      : 0n;
  const maxStakeAmount = parseFloat(formatEther(maxStakeRaw));
  const estimatedNetworkFee = formatNumber(formatEther(stakeNetworkFeeRaw), 6);
  const totalRequiredRaw = amountRaw + stakeNetworkFeeRaw;
  const totalRequired = formatNumber(formatEther(totalRequiredRaw), 6);
  const walletBalance = formatNumber(formatEther(walletBalanceRaw), 6);
  const isInsufficientBalance =
    isConnected && amountRaw > 0n && amountRaw > maxStakeRaw;
  const isInvalidAmount = numAmount < minStake;

  useEffect(() => {
    if (isOpen) {
      setAmount("");
      setIsSuccess(false);
    }
  }, [isOpen, setIsSuccess]);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    getEstimatedStakeNetworkFee()
      .then((fee) => {
        if (isMounted) setStakeNetworkFeeRaw(fee);
      })
      .catch(() => {
        if (isMounted) setStakeNetworkFeeRaw(DEFAULT_STAKE_NETWORK_FEE_WEI);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsSuccess(false);
    onClose();
    if (isSuccess && !isOnPortfolio) navigate("/portfolio");
  };

  const canStake = useMemo(
    () =>
      isConnected &&
      !isInvalidAmount &&
      !isInsufficientBalance &&
      !getStakingActionBlockReason({
        action: "stake",
        chainId,
        expectedChainId: blockdagTestnet.id,
        contractVersion: version,
        isPending: isContractStaking,
        genesisHash: networkValidation.genesisHash,
        expectedGenesisHash: networkValidation.expectedGenesisHash,
        isGenesisChecking: networkValidation.isGenesisChecking,
      }) &&
      !isContractStaking,
    [isConnected, isInvalidAmount, isInsufficientBalance, chainId, version, isContractStaking, networkValidation.genesisHash, networkValidation.expectedGenesisHash, networkValidation.isGenesisChecking],
  );

  const stakeBlockReason = getStakingActionBlockReason({
    action: "stake",
    chainId,
    expectedChainId: blockdagTestnet.id,
    contractVersion: version,
    isPending: isContractStaking,
    genesisHash: networkValidation.genesisHash,
    expectedGenesisHash: networkValidation.expectedGenesisHash,
    isGenesisChecking: networkValidation.isGenesisChecking,
  });

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow empty or valid positive numbers only
      if (val === "" || /^\d*\.?\d{0,4}$/.test(val)) {
        setAmount(val);
      }
    },
    [],
  );

  const formatAmountForInput = useCallback((value: number) => {
    const rounded = Math.floor(value * 1000) / 1000;
    return rounded.toFixed(3).replace(/\.0+$/, "").replace(/\.$/, "");
  }, []);

  const handleMaxClick = useCallback(() => {
    if (maxStakeAmount > 0) {
      const maxAmount = Math.max(0, maxStakeAmount);
      setAmount(formatAmountForInput(maxAmount));
    }
  }, [maxStakeAmount, formatAmountForInput]);

  const handleStake = useCallback(async () => {
    if (!canStake || !targetPool) return;
    try {
      const recipt = await contractStake(targetPool, amount);
      if (recipt?.status === "success") refetchTotalStaked();
    } catch (err) {
      console.error("Staking error:", err);
    }
  }, [canStake, targetPool, contractStake, amount, refetchTotalStaked]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="glass-card border-primary/20 max-w-md p-0 gap-0 overflow-hidden">
        <DialogDescription className="sr-only">Review the amount, pool terms and waiting periods before confirming.</DialogDescription>
        <ConfirmingOverlay active={isConfirming} contained />
        {isSuccess ? (
          <div className="p-8 flex flex-col items-center text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h3 className="text-2xl font-display font-bold mb-2">
              Staked Successfully!
            </h3>
            <p className="text-muted-foreground mb-6">
              You have successfully staked{" "}
              <span className="text-foreground font-medium">
                {formatNumber(numAmount, 2)} BDAG
              </span>{" "}
              in the pool.
            </p>

            <div className="w-full bg-secondary/30 rounded-lg p-4 mb-8 text-left border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase mb-1 font-medium">
                Transaction Hash
              </p>
              <div className="flex items-center justify-between">
                <ExplorerLink
                  className="text-sm font-mono text-primary"
                  path={`tx/${hash}`}
                >
                  {truncatedHash(hash, 12, 12)}
                </ExplorerLink>
                <CopyButton
                  value={hash || ""}
                  className="w-auto p-1.5 h-auto text-muted-foreground hover:text-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col w-full gap-3">
              {/* <Button
                onClick={() => window.open(`${ENV.CHAIN.BLOCK_EXPLORER_URL}tx/${hash}`, "_blank")}
                variant="outline"
                className="w-full gap-2 border-primary/20 hover:bg-primary/10"
              >
                <ExternalLink className="w-4 h-4" />
                View on Explorer
              </Button> */}
              <Button onClick={handleClose} className="w-full btn-primary-glow">
                {isOnPortfolio ? "Close" : "View Portfolio"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <DialogTitle className="font-display text-xl">
                  Stake
                  {/* on {pool.name} */}
                </DialogTitle>
                {/* <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button> */}
              </div>
            </DialogHeader>

            <div className="p-6 space-y-6">
              <TransactionStatusNotice
                transaction={transactionStatus}
                onApplyRepair={applyNonceRepair}
                isApplyingRepair={isRepairing}
              />
              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor={amountInputId} className="data-label">Enter BDAG Amount</label>
                  <span className="text-xs text-muted-foreground">
                    Stakeable: {formatNumber(maxStakeAmount, 3)} BDAG
                  </span>
                </div>
                <StakeBoundaryStatus reason={stakeBlockReason} isPending={isContractStaking} />
                <div className="relative">
                  <Input
                    id={amountInputId}
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={handleAmountChange}
                    className="bg-input border-border/50 pr-16 text-lg h-12"
                  />
                  <button
                    onClick={handleMaxClick}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              {/* Reward Formula Card */}
              {/* <div className="glass-card !bg-primary/5 p-4 border border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Reward Calculation</span>
            </div>
            <div className="text-xs text-muted-foreground font-mono bg-background/50 p-3 rounded-lg">
              <p className="mb-1">
                Rewards = (Total Stake × Global Rate) - Reward Debt
              </p>
              {numAmount > 0 && (
                <p className="text-primary mt-2">
                  = ({formatBDAG(numAmount)} × Global Rate) - Reward Debt
                </p>
              )}
            </div>
          </div> */}

              {/* Stats Preview */}
              <div className="glass-card !bg-secondary/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Estimated APY
                    </span>
                    <InfoTooltip content="Dynamic APY based on total network stake. More stakers = lower APY." />
                  </div>
                  <span className="text-sm font-medium text-success">
                    ~{formatNumber(lowestPoolApy)}%
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      Contract Address
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ExplorerLink
                      path={`contractOverview/${ENV.CHAIN.STAKING_CONTRACT_ADDRESS}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-foreground hover:text-primary transition-colors hover:underline"
                    >
                      {truncatedHash(
                        ENV.CHAIN.STAKING_CONTRACT_ADDRESS || "",
                        6,
                        4,
                      )}
                    </ExplorerLink>
                    <CopyButton
                      value={ENV.CHAIN.STAKING_CONTRACT_ADDRESS}
                      className="w-auto p-1 h-auto text-muted-foreground hover:text-primary transition-colors"
                    />
                  </div>
                </div>

                {/* <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  Reward Split
                </span>
                <InfoTooltip
                  content={`${STAKING_CONSTANTS.MINER_SHARE}% of block emissions go to miners, ${STAKING_CONSTANTS.STAKER_SHARE}% to stakers.`}
                />
              </div>
              <span className="text-sm font-medium">
                {STAKING_CONSTANTS.MINER_SHARE}/{STAKING_CONSTANTS.STAKER_SHARE}{" "}
                Miner/Staker
              </span>
            </div> */}

                {/* {numAmount > 0 && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Est. Weekly Reward
                  </span>
                  <span className="text-sm font-medium text-success">
                    ~{afterCommission.toFixed(2)} BDAG
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Est. Yearly Reward
                  </span>
                  <span className="text-sm font-medium text-success">
                    ~{yearlyEstimate.toFixed(2)} BDAG
                  </span>
                </div>
              </div>
            )} */}
              </div>

              {/* Unbonding Warning */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
                <Clock className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-warning">
                    {stakingPeriodLabels.unbondingTitle} Unbonding Period
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unstaking requires a{" "}
                    {stakingPeriodLabels.unbondingHyphenated} unbonding period.
                    Your BDAG will be locked during this time.
                  </p>
                </div>
              </div>

              {/* Security Note */}
              <div className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Your BDAG stays in a non-custodial smart contract vault.
                  Rewards come only from block emissions. There are no fees or burn rewards.
                </p>
              </div>

              {/* Error State */}
              {isInsufficientBalance && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">
                        Not enough BDAG for this stake plus the network fee.
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-destructive/90">
                        <span>Wallet balance</span>
                        <span className="text-right">{walletBalance} BDAG</span>
                        <span>Stake amount</span>
                        <span className="text-right">
                          {formatNumber(amount, 6)} BDAG
                        </span>
                        <span>Estimated network fee</span>
                        <span className="text-right">
                          {estimatedNetworkFee} BDAG
                        </span>
                        <span>Total required</span>
                        <span className="text-right">{totalRequired} BDAG</span>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {maxStakeAmount >= minStake && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 border-destructive/30 bg-background/40 text-destructive hover:bg-destructive/10"
                            onClick={handleMaxClick}
                          >
                            Stake Max Available
                          </Button>
                        )}
                        <span className="text-xs text-destructive/80">
                          Reduce the amount or add BDAG to your wallet.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {numAmount > 0 && numAmount < minStake && (
                <div className="flex items-center gap-2 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>
                    Minimum stake is{" "}
                    {formatNumber(minStake, 6)} BDAG
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 btn-secondary-outline"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleStake}
                  disabled={!canStake}
                  className={cn(
                    "flex-1 btn-primary-glow text-primary-foreground font-medium",
                    isConfirming && "btn-confirming",
                  )}
                >
                  {isConfirming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Confirming...
                    </>
                  ) : isContractStaking ? (
                    "Staking..."
                  ) : (
                    "Confirm Stake"
                  )}
                </Button>
              </div>

              {!isConnected && (
                <p className="text-xs text-center text-muted-foreground">
                  Connect your wallet to stake
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
