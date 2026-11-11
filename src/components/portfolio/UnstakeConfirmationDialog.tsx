import React, { useState, useCallback, useEffect } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { useContractVersion } from "@/hooks/use-contract-version";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { ConfirmingOverlay } from "@/components/ui/confirming-overlay";
import { useChainTime } from "@/hooks/use-chain-time";
import { useEpochStatus } from "@/hooks/use-epoch-status";
import { useStakingPeriods } from "@/hooks/use-staking-periods";
import { formatUtcDateTime } from "@/lib/utils";
import { estimateWithdrawalRelease } from "@/lib/withdrawal-estimate";

interface UnstakeConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (amount: string, isMax: boolean) => void;
    title: string;
    description: string;
    maxAvailable: string | number;
    isPending?: boolean;
    isConfirming?: boolean;
}

export const UnstakeConfirmationDialog: React.FC<UnstakeConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    maxAvailable,
    isPending = false,
    isConfirming = false,
}) => {
    const [amount, setAmount] = useState("");
    const [isMax, setIsMax] = useState(false);
    const { minStake } = useContractVersion();
    const { chainTime } = useChainTime();
    const epoch = useEpochStatus();
    const periods = useStakingPeriods();
    const projectedRelease = epoch.error || periods.error || periods.isLoading ? undefined : estimateWithdrawalRelease({
        chainTime, nextEpochStartTime: epoch.nextEpochStartTime, unbondingPeriod: periods.unbondingPeriod,
    });

    useEffect(() => {
        if (isOpen) {
            setAmount("");
            setIsMax(false);
        }
    }, [isOpen]);

    const handleAmountChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            if (val === "" || /^\d*\.?\d{0,18}$/.test(val)) {
                setAmount(val);
                setIsMax(false);
            }
        },
        [],
    );

    const handleMaxClick = useCallback(() => {
        setAmount(maxAvailable.toString());
        setIsMax(true);
    }, [maxAvailable]);

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="overflow-hidden glass-card border-primary/20">
                <ConfirmingOverlay active={isConfirming} contained />
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Unstake Amount</label>
                        <span className="text-xs text-muted-foreground">
                            Available: {formatNumber(maxAvailable, 2)} BDAG
                        </span>
                    </div>
                    <div className="relative">
                        <Input
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
                    {amount &&
                        parseFloat(amount) > 0 &&
                        parseFloat(amount) < minStake &&
                        parseFloat(amount).toFixed(18) !== parseFloat(maxAvailable.toString()).toFixed(18) && (
                            <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                                <AlertCircle className="w-4 h-4" />
                                <span>Minimum unstake is {formatNumber(minStake, 6)} BDAG</span>
                            </div>
                        )}
                    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground leading-normal">
                            {periods.error || periods.isLoading ? "The current waiting period is loading from the contract." : `This starts a ${periods.formatted.unbondingHyphenated} waiting period, measured from the next epoch boundary.`}
                            {projectedRelease ? ` Estimated release: ${formatUtcDateTime(projectedRelease * 1000)}.` : " The exact release date is recorded when your transaction confirms."}
                        </p>
                    </div>
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={() => onConfirm(amount, isMax)}
                        disabled={
                            !amount ||
                            parseFloat(amount) <= 0 ||
                            (parseFloat(amount) < minStake && !isMax) ||
                            parseFloat(amount) > parseFloat(maxAvailable.toString()) ||
                            isPending
                        }
                        className={cn(
                            "bg-destructive hover:bg-destructive/90 text-destructive-foreground",
                            isConfirming && "btn-confirming",
                        )}
                    >
                        {isConfirming ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Confirming...
                            </>
                        ) : isPending ? (
                            "Submitting..."
                        ) : (
                            "Confirm Unstake"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
