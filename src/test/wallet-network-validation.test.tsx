import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";
const genesisHash = "0x" + "ab".repeat(32);
const mocks = vi.hoisted(() => ({ request: vi.fn(), clientReady: true }));
vi.mock("wagmi", () => ({
  useChainId: () => 1043,
  useConnection: () => ({ isConnected: true, address: "0x" + "12".repeat(20) }),
  useConnectorClient: () => ({ data: mocks.clientReady ? { request: mocks.request } : undefined, isLoading: false }),
}));
vi.mock("@wagmi/core", () => ({ getConnectorClient: vi.fn() }));
vi.mock("@/config/reown", () => ({ wagmiAdapter: { wagmiConfig: {} } }));
vi.mock("@/config/env", () => ({ ENV: { CHAIN: { ID: 1043, EXPECTED_GENESIS_HASH: "0x" + "ab".repeat(32) } } }));
const wrapper = ({ children }: { children: React.ReactNode }) => <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>;
beforeEach(() => { cleanup(); mocks.request.mockReset(); mocks.clientReady = true; });
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("keeps a connected wallet in checking state while its connector is unavailable", () => {
  mocks.clientReady = false;
  const { result } = renderHook(useWalletNetworkValidation, { wrapper });
  expect(result.current.isGenesisChecking).toBe(true);
  expect(result.current.isGenesisValid).toBe(false);
});
it("blocks stale verified data after a refresh error and restores verification through read-only retry", async () => {
  mocks.request.mockResolvedValue({ hash: genesisHash });
  const { result } = renderHook(useWalletNetworkValidation, { wrapper });
  await waitFor(() => expect(result.current.isGenesisValid).toBe(true));
  mocks.request.mockRejectedValue(new Error("RPC busy"));
  await act(async () => { await result.current.retry(); });
  await waitFor(() => expect(result.current.genesisError).toBe("RPC busy"));
  expect(result.current.isGenesisValid).toBe(false);
  expect(result.current.genesisHash).toBeNull();
  mocks.request.mockResolvedValue({ hash: genesisHash });
  await act(async () => { await result.current.retry(); });
  await waitFor(() => expect(result.current.isGenesisValid).toBe(true));
  expect(mocks.request.mock.calls.every(([request]) => request.method === "eth_getBlockByNumber")).toBe(true);
});

it("automatically recovers a transient refresh failure without authorizing stale data", async () => {
  mocks.request.mockResolvedValue({ hash: genesisHash });
  const { result } = renderHook(useWalletNetworkValidation, { wrapper });
  await waitFor(() => expect(result.current.isGenesisValid).toBe(true));
  vi.useFakeTimers();
  mocks.request.mockRejectedValueOnce(new Error("Network request failed"));
  await act(async () => { await result.current.retry(); });
  expect(result.current.isGenesisValid).toBe(false);
  expect(result.current.genesisHash).toBeNull();
  await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
  expect(result.current.isGenesisValid).toBe(true);
  expect(mocks.request.mock.calls.every(([request]) => request.method === "eth_getBlockByNumber")).toBe(true);
});

it("bounds automatic recovery attempts and never makes a wrong genesis valid", async () => {
  vi.useFakeTimers();
  mocks.request.mockRejectedValue(new Error("RPC timeout"));
  const { result } = renderHook(useWalletNetworkValidation, { wrapper });
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(mocks.request).toHaveBeenCalledTimes(3);
  expect(result.current.isGenesisValid).toBe(false);
  expect(result.current.genesisHash).toBeNull();
  mocks.request.mockResolvedValue({ hash: "0x" + "cd".repeat(32) });
  await act(async () => { await result.current.retry(); });
  expect(result.current.isGenesisValid).toBe(false);
  expect(result.current.genesisHash).not.toBe(genesisHash);
});
