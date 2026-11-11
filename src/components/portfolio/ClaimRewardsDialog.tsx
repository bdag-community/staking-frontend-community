import React from "react";
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
import { Gift, Info, Loader2 } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { ConfirmingOverlay } from "@/components/ui/confirming-overlay";

interface ClaimRewardsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    totalClaimable: number | string;
    isDisabled?: boolean;
    isPending?: boolean;
    isConfirming?: boolean;
}

export const ClaimRewardsDialog: React.FC<ClaimRewardsDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    totalClaimable,
    isDisabled = false,
    isPending = false,
    isConfirming = false,
}) => {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="overflow-hidden glass-card border-primary/20">
                <ConfirmingOverlay active={isConfirming} contained />
                <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                        <Gift className="w-5 h-5 text-success" />
                        Claim Available Payout
                    </AlertDialogTitle>
                    <div className="space-y-3">
                        <AlertDialogDescription>
                            Claim all your released BDAG. Matured withdrawal requests are settled together and may include principal and rewards.
                        </AlertDialogDescription>
                        <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                            <p className="text-lg font-bold text-success text-center">
                                {formatNumber(totalClaimable, 2)} BDAG
                            </p>
                            <p className="text-xs text-center text-muted-foreground mt-1">
                                Will be added to your wallet balance
                            </p>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-primary/5 border border-primary/10 mt-2">
                            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-normal">
                                The contract records a combined payout, without a reliable principal and rewards split. Network gas applies; there is no platform fee.
                            </p>
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isDisabled || isPending}
                        className={cn(
                            "bg-success hover:bg-success/90 text-success-foreground",
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
                            "Confirm Claim"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
