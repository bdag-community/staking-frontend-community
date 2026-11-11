import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NetworkReadGate } from "@/components/layout/NetworkReadGate";
const state = vi.hoisted(() => ({ data: undefined as boolean | undefined, error: null as Error | null }));
vi.mock("swr", () => ({ default: () => ({ ...state, mutate: vi.fn() }) }));
describe("site RPC verification", () => {
  beforeEach(() => { cleanup(); state.data = undefined; state.error = null; });
  it("hides balances until the configured network has been verified", () => {
    render(<NetworkReadGate><div>Wallet balance</div></NetworkReadGate>);
    expect(screen.queryByText("Wallet balance")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Verifying");
  });
  it("hides previously verified balances after an RPC failure", () => {
    state.data = true; state.error = new Error("wrong network");
    render(<NetworkReadGate><div>Wallet balance</div></NetworkReadGate>);
    expect(screen.queryByText("Wallet balance")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry connection" })).toBeInTheDocument();
  });
  it("shows the app when verification succeeds", () => {
    state.data = true;
    render(<NetworkReadGate><div>Wallet balance</div></NetworkReadGate>);
    expect(screen.getByText("Wallet balance")).toBeInTheDocument();
  });
});
