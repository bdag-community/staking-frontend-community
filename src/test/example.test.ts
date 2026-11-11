import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { PortfolioConnectPrompt } from "@/components/portfolio/PortfolioConnectPrompt";
import { StakeBoundaryStatus } from "@/components/ui/stake-boundary-status";

vi.mock("@/components/wallet/ConnectButton", () => ({
  ConnectButton: ({ className }: { className?: string }) => (
    React.createElement("button", { className }, "Connect Wallet")
  ),
}));
import { ACTIONS } from "@/content/actions";
import { sortPools } from "@/lib/pool-view";
import { resolveStakingContractAddress } from "@/lib/staking-contract";
import { ENV } from "@/config/env";
import { getFreshWalletWriteBlockReason, getStakingActionBlockReason } from "@/lib/staking-boundaries";
import { mapTrackedTransactionStatus } from "@/hooks/use-staking-contract";
import { CredentialActionPanel } from "@/components/credentials/CredentialActionPanel";
import { LegacyPositionList } from "@/components/legacy/LegacyPositionList";
import { mergeLegacyPoolAddresses } from "@/hooks/use-legacy-positions";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});

describe("staking platform content", () => {
  it("renders a concise disconnected portfolio state without fake balances or wizard copy", () => {
    render(React.createElement(PortfolioConnectPrompt));
    expect(screen.getByRole("heading", { name: "Portfolio" })).toBeInTheDocument();
    expect(screen.getByText("Connect to view your portfolio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Legacy Staking" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /connect wallet/i })).toBeInTheDocument();
    expect(screen.queryByText(/community staking platform/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/wizard/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/0m|0s/)).not.toBeInTheDocument();
  });

  it("renders the wallet boundary state before signing", () => {
    render(React.createElement(StakeBoundaryStatus, { reason: "Switch to BlockDAG before staking.", isPending: false }));
    expect(screen.getByRole("status")).toHaveTextContent("Switch to BlockDAG before staking.");
  });

  it("does not replace a pending transaction with a stale boundary message", () => {
    render(React.createElement(StakeBoundaryStatus, { reason: "Switch to BlockDAG before staking.", isPending: true }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("explains that claimStake settles principal and rewards together", () => {
    expect(ACTIONS.claim.description).toContain("principal and rewards");
    expect(ACTIONS.claim.contractCall).toBe("claimStake(pool)");
  });

  it("sorts pool figures by the selected market metric", () => {
    const pools = [
      { poolAddress: "0xslow", totalStaked: "20", apy: { yearlyApy: 7 }, totalStakers: 3 },
      { poolAddress: "0xfast", totalStaked: "2", apy: { yearlyApy: 12 }, totalStakers: 8 },
    ];

    expect(sortPools(pools, "apy").map((pool) => pool.poolAddress)).toEqual([
      "0xfast",
      "0xslow",
    ]);
  });

  it("keeps current, V1, and V2 address selection explicit", () => {
    expect(resolveStakingContractAddress()).toBe(ENV.CHAIN.STAKING_CONTRACT_ADDRESS);
    expect(resolveStakingContractAddress("v1")).toBe(ENV.CHAIN.STAKING_V1_ADDRESS);
    expect(resolveStakingContractAddress("v2")).toBe(ENV.CHAIN.STAKING_V2_ADDRESS);
  });

  it("blocks writes at wallet boundaries before a provider signature", () => {
    expect(getStakingActionBlockReason({ action: "stake", chainId: 1, expectedChainId: 8008, contractVersion: "2.0.0" })).toContain("Switch");
    expect(getStakingActionBlockReason({ action: "stake", chainId: 8008, expectedChainId: 8008, contractVersion: "1.0.0" })).toContain("V2");
    expect(getStakingActionBlockReason({ action: "claim", chainId: 8008, expectedChainId: 8008, contractVersion: "2.0.0", isClaimable: false })).toContain("mature");
    expect(getStakingActionBlockReason({ action: "unstake", chainId: 8008, expectedChainId: 8008, contractVersion: "2.0.0", isPending: true })).toContain("awaiting");
    expect(getStakingActionBlockReason({ action: "stake", chainId: 8008, expectedChainId: 8008, contractVersion: "2.0.0", genesisHash: "0xwrong", expectedGenesisHash: `0x${"3".repeat(64)}` })).toContain("different BlockDAG");
    expect(getStakingActionBlockReason({ action: "stake", chainId: 8008, expectedChainId: 8008, contractVersion: "2.0.0", isGenesisChecking: true })).toContain("Verifying");
  });

  it("blocks the final write when the fresh wallet genesis or account changes", () => {
    const wrongGenesis = getFreshWalletWriteBlockReason({
      action: "stake",
      snapshot: { chainId: 8008, genesisHash: "0xwrong", account: "0x0000000000000000000000000000000000000001" },
      expectedAccount: "0x0000000000000000000000000000000000000001",
      expectedChainId: 8008,
      expectedGenesisHash: `0x${"3".repeat(64)}`,
      contractVersion: "2.0.0",
    });
    const changedAccount = getFreshWalletWriteBlockReason({
      action: "stake",
      snapshot: { chainId: 8008, genesisHash: `0x${"3".repeat(64)}`, account: "0x0000000000000000000000000000000000000002" },
      expectedAccount: "0x0000000000000000000000000000000000000001",
      expectedChainId: 8008,
      expectedGenesisHash: `0x${"3".repeat(64)}`,
      contractVersion: "2.0.0",
    });
    expect(wrongGenesis).toContain("different BlockDAG");
    expect(changedAccount).toContain("wallet changed");
  });

  it("keeps backend pending and reverted receipts visible to transaction UI", () => {
    const pending = mapTrackedTransactionStatus({ txHash: `0x${"a".repeat(64)}`, stakerAddress: "0xdef", status: "pending" });
    const reverted = mapTrackedTransactionStatus({ txHash: `0x${"a".repeat(64)}`, stakerAddress: "0xdef", status: "reverted" });
    expect(pending?.status).toBe("pending");
    expect(pending?.backendStatus).toBe("pending");
    expect(reverted?.backendStatus).toBe("reverted");
    expect(reverted.status).toBe("pending");
  });

  it("renders domain-specific credential actions and submits the exact source epoch", () => {
    const onClaim = vi.fn();
    render(React.createElement(CredentialActionPanel, {
      stakingConfigured: true,
      miningConfigured: true,
      stakingReady: true,
      stakingClaimable: true,
      miningClaimable: true,
      miningReady: true,
      stakingEpoch: 12n,
      miningEpoch: 9n,
      registeredPools: ["0x0000000000000000000000000000000000000002"],
      isPending: false,
      actionMessage: "",
      onClaim,
      onDelegate: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Claim optional staking receipt" }));
    fireEvent.click(screen.getByRole("button", { name: "Claim optional mining receipt" }));
    expect(onClaim).toHaveBeenNthCalledWith(1, "staking", 12n, ["0x0000000000000000000000000000000000000002"]);
    expect(onClaim).toHaveBeenNthCalledWith(2, "mining", 9n, []);
  });

  it("keeps credential actions disabled until the matching domain is ready", () => {
    render(React.createElement(CredentialActionPanel, {
      stakingConfigured: true,
      miningConfigured: false,
      stakingReady: false,
      stakingClaimable: false,
      miningClaimable: false,
      miningReady: false,
      stakingEpoch: 12n,
      miningEpoch: 9n,
      registeredPools: [],
      isPending: false,
      actionMessage: "",
      onClaim: vi.fn(),
      onDelegate: vi.fn(),
    }));
    expect(screen.getByRole("button", { name: "Claim optional staking receipt" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Claim optional mining receipt" })).toBeDisabled();
  });

  it("renders the V1 pool and exact principal for the legacy unstake action", () => {
    const onUnstake = vi.fn();
    const pool = "0x0000000000000000000000000000000000000003" as `0x${string}`;
    render(React.createElement(LegacyPositionList, {
      positions: [{ pool, shares: 2_000_000_000_000_000_000n, principal: 1_250_000_000_000_000_000n, liquidValue: 2_500_000_000_000_000_000n, blockNumber: 126n }],
      isLoading: false,
      error: null,
      isPending: false,
      unstakingPool: null,
      onUnstake,
    }));
    expect(screen.getByText(/2\.5 BDAG redeemable at block 126/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: `Unstake amount for ${pool}` }), { target: { value: "1.75" } });
    fireEvent.click(screen.getByRole("button", { name: "Unstake chosen amount" }));
    expect(onUnstake).toHaveBeenCalledWith(pool, 1_750_000_000_000_000_000n);
  });

  it("discovers a V1 position from the known pool directory without event history", () => {
    const pool = "0x0000000000000000000000000000000000000004";
    expect(mergeLegacyPoolAddresses([], [], [pool], [])).toEqual([pool]);
  });
});
