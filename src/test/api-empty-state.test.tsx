import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { stakingApi } from "@/lib/api";
import { TransactionStatusNotice } from "@/components/ui/transaction-status-notice";
import { mapTrackedTransactionStatus } from "@/hooks/use-staking-contract";
afterEach(() => vi.unstubAllGlobals());
describe("wallet connection without a pending transaction", () => {
  it("preserves an explicit null response instead of returning an envelope as transaction data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, message: "Success", data: null }))));
    expect((await stakingApi.get("/transactions/nonce-repair/wallet")).data).toBeNull();
  });
  it("does not map an empty response to a pending transaction", () => {
    expect(mapTrackedTransactionStatus({} as never)).toBeNull();
  });
  it("does not display a pending notice without a real transaction hash", () => {
    render(<TransactionStatusNotice transaction={{ hash: undefined, status: "pending" } as never} />);
    expect(screen.queryByText("Transaction pending")).not.toBeInTheDocument();
  });
  it("keeps a real pending transaction visible", () => {
    const result = mapTrackedTransactionStatus({ txHash: `0x${"a".repeat(64)}`, stakerAddress: `0x${"b".repeat(40)}`, status: "pending" });
    expect(result?.status).toBe("pending");
  });
});
