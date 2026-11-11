import React from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Address } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CredentialActionPanelProps = {
  stakingConfigured: boolean;
  miningConfigured: boolean;
  stakingReady: boolean;
  miningReady: boolean;
  stakingClaimable: boolean;
  miningClaimable: boolean;
  stakingReason?: string;
  miningReason?: string;
  stakingEpoch?: bigint;
  miningEpoch?: bigint;
  registeredPools: Address[];
  isPending: boolean;
  actionMessage: string;
  onClaim: (domain: "staking" | "mining", epoch: bigint, pools: Address[]) => void;
  onDelegate: (delegatee: Address) => void;
};

export const CredentialActionPanel = ({
  stakingConfigured,
  miningConfigured,
  stakingReady,
  miningReady,
  stakingClaimable,
  miningClaimable,
  stakingReason,
  miningReason,
  stakingEpoch,
  miningEpoch,
  registeredPools,
  isPending,
  actionMessage,
  onClaim,
  onDelegate,
}: CredentialActionPanelProps) => {
  const [delegatee, setDelegatee] = React.useState("");
  const hasAddress = /^0x[a-fA-F0-9]{40}$/.test(delegatee);
  return <div className="mt-4 grid gap-3">
    <Button className="btn-primary-glow" disabled={isPending || !stakingConfigured || !stakingReady || !stakingClaimable || stakingEpoch === undefined} onClick={() => onClaim("staking", stakingEpoch ?? 0n, registeredPools)}>{isPending ? <Loader2 className="animate-spin" /> : <Sparkles />}Claim optional staking receipt</Button>
    {stakingReason && <p className="text-sm leading-6 text-muted-foreground">{stakingReason}</p>}
    <Button variant="outline-glow" disabled={isPending || !miningConfigured || !miningReady || !miningClaimable || miningEpoch === undefined} onClick={() => onClaim("mining", miningEpoch ?? 0n, [])}>Claim optional mining receipt</Button>
    {miningReason && <p className="text-sm leading-6 text-muted-foreground">{miningReason}</p>}
    <details className="mt-4 border-t border-border/70 pt-5"><summary className="cursor-pointer text-sm font-medium">Voting settings (optional)</summary><div className="mt-4 grid gap-3"><p className="text-sm leading-6 text-muted-foreground">Choose a wallet to vote on your behalf in the Staking DAO. This changes voting authority only. It cannot move your BDAG.</p>
    <p className="text-xs leading-5 text-muted-foreground">Your earned power becomes active automatically. Claiming a receipt is optional and pool discovery is derived from canonical staking activity.</p>
    <div className="flex flex-col gap-2 sm:flex-row"><Input aria-label="Voting representative wallet" placeholder="Wallet address (0x…)" value={delegatee} onChange={(event) => setDelegatee(event.target.value)} /><Button variant="outline-glow" disabled={isPending || !stakingConfigured || !hasAddress} onClick={() => onDelegate(delegatee as Address)}>Set representative</Button></div></div></details>
    {actionMessage && <p role="status" className="text-xs text-muted-foreground">{actionMessage}</p>}
  </div>;
};
