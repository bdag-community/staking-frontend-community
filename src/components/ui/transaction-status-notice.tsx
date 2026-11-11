import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Wrench,
} from "lucide-react";
import type { TransactionStatusState } from "@/hooks/use-staking-contract";
import {ExplorerLink} from "@/components/ui/explorer-link";
import { truncatedHash } from "@/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

interface TransactionStatusNoticeProps {
  transaction: TransactionStatusState | null;
  onApplyRepair?: () => void;
  isApplyingRepair?: boolean;
}

export const TransactionStatusNotice = ({
  transaction,
  onApplyRepair,
  isApplyingRepair = false,
}: TransactionStatusNoticeProps) => {
  if (!transaction || !/^0x[0-9a-fA-F]{64}$/.test(transaction.hash ?? "")) return null;

  const isStuck = transaction.status === "stuck";
  const isRepairConfirmed =
    transaction.repairStatus === "confirmed" ||
    transaction.backendStatus === "replaced";
  const isRepairActive = transaction.repairStatus === "checking";
  const isRepairSubmitted = transaction.repairStatus === "submitted";
  const needsWalletSignature =
    transaction.repairStatus === "signature_required" &&
    (transaction.repairTxPlan?.length ?? 0) > 0;
  const isRepairBlocked =
    transaction.repairStatus === "failed" ||
    transaction.repairStatus === "unavailable" ||
    transaction.repairStatus === "skipped";
  const repairTxHashes = transaction.repairTxHashes ?? [];
  const alertClass = isRepairConfirmed
    ? "mb-6 border-success/40 bg-success/10"
    : isRepairBlocked || isStuck
      ? "mb-6 border-warning/40 bg-warning/10"
      : "mb-6 border-primary/30 bg-primary/10";
  const title = isRepairConfirmed
    ? "Nonce repair completed"
    : needsWalletSignature
      ? "Nonce repair ready"
    : isRepairSubmitted
      ? "Nonce repair submitted"
      : isRepairActive
        ? "Checking nonce repair"
        : isStuck
          ? "Transaction pending or stuck"
          : "Transaction pending";
  const description = (() => {
    if (isRepairConfirmed) {
      return "Replacement transaction(s) were mined. Balances may take a moment to refresh.";
    }
    if (isRepairSubmitted) {
      return "Low-gas nonce blockage was found. Replacement transaction(s) have been submitted with higher gas fees.";
    }
    if (needsWalletSignature) {
      return `Low-gas nonce blockage was found. Sign ${
        transaction.repairTxPlan?.length ?? 0
      } replacement transaction(s) with your connected wallet to apply the repair.`;
    }
    if (transaction.repairStatus === "checking") {
      return "Confirmation timed out. The staking service is checking the txpool for low-gas transactions that may be blocking your nonce.";
    }
    if (transaction.repairStatus === "unavailable") {
      return "Low-gas nonce replacement may be needed, but this wallet must sign the replacement. Use your wallet's speed-up or cancel flow, or contact support with the hash.";
    }
    if (transaction.repairStatus === "skipped") {
      return "Low-gas nonce pressure was detected, but automated repair was not applied because it would replace or fill a non-claim transaction.";
    }
    if (transaction.repairStatus === "failed") {
      return "A nonce repair attempt failed. Keep the transaction hash and contact support if the wallet remains blocked.";
    }
    if (transaction.repairStatus === "not_needed") {
      return "Confirmation timed out, but no low-gas nonce requiring replacement was found yet. The transaction may still confirm.";
    }
    return isStuck
      ? "Confirmation timed out. The transaction may still be pending; check the hash before submitting another transaction."
      : "Waiting for the network to include this transaction.";
  })();
  const Icon = isRepairConfirmed
    ? CheckCircle2
    : isRepairActive || isRepairSubmitted || needsWalletSignature
      ? Wrench
      : isStuck
        ? AlertTriangle
        : Clock;

  return (
    <Alert className={alertClass}>
      <Icon
        className={
          isRepairConfirmed
            ? "h-4 w-4 text-success"
            : isStuck
              ? "h-4 w-4 text-warning"
              : "h-4 w-4 text-primary"
        }
      />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        <div className="space-y-2">
          <p>{description}</p>
          {transaction.repairReason && (
            <p className="text-xs text-muted-foreground">
              {transaction.repairReason}
            </p>
          )}
          {needsWalletSignature && onApplyRepair && (
            <Button
              type="button"
              size="sm"
              className="mt-1 gap-2"
              disabled={isApplyingRepair}
              onClick={onApplyRepair}
            >
              <Wrench className="h-3.5 w-3.5" />
              {isApplyingRepair ? "Opening wallet..." : "Sign nonce repair"}
            </Button>
          )}
          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Hash</span>
              <div className="flex items-center gap-2 font-mono text-foreground">
                <ExplorerLink
                  path={`tx/${transaction.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {truncatedHash(transaction.hash, 10, 10)}
                  <ExternalLink className="h-3 w-3" />
                </ExplorerLink>
                <CopyButton
                  value={transaction.hash}
                  className="h-auto w-auto p-0 text-muted-foreground hover:text-primary"
                />
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Nonce</span>
              <p className="font-mono text-foreground">
                {transaction.nonce ?? "Unknown"}
              </p>
            </div>
          </div>
          {repairTxHashes.length > 0 && (
            <div className="space-y-1 pt-1 text-xs">
              <span className="text-muted-foreground">Replacement txs</span>
              {repairTxHashes.map((tx) => {
                return (
                  <div
                    key={`${tx.hash}-${tx.nonce}`}
                    className="flex flex-wrap items-center gap-2 font-mono text-foreground"
                  >
                    <span className="text-muted-foreground">
                      nonce {tx.nonce} {tx.kind}
                    </span>
                    <ExplorerLink
                      path={`tx/${tx.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {truncatedHash(tx.hash, 10, 10)}
                      <ExternalLink className="h-3 w-3" />
                    </ExplorerLink>
                    <CopyButton
                      value={tx.hash}
                      className="h-auto w-auto p-0 text-muted-foreground hover:text-primary"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
};
