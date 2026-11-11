import { beforeEach, expect, it, vi } from "vitest";
import { createConfig, createStorage, injected, reconnect } from "@wagmi/core";
import { defineChain, http, type EIP1193Provider } from "viem";

const captured = vi.hoisted(() => ({ createAppKit: vi.fn() }));
vi.mock("@reown/appkit/react", () => ({ createAppKit: captured.createAppKit }));
vi.mock("@reown/appkit-adapter-wagmi", () => ({ WagmiAdapter: class { wagmiConfig = {}; } }));
vi.mock("@/config/env", () => ({ ENV: { REOWN_PROJECT_ID: "test-project", CHAIN: { ID: 1043, NAME: "Testnet", CURRENCY_NAME: "BDAG", CURRENCY_SYMBOL: "BDAG", RPC_URL: "https://rpc.invalid", BLOCK_EXPLORER_URL: "" } } }));

beforeEach(() => { vi.resetModules(); captured.createAppKit.mockClear(); });
it("enables restoring an authorized session while disabling automatic network switching", async () => {
  await import("@/config/reown");
  expect(captured.createAppKit).toHaveBeenCalledWith(expect.objectContaining({ enableReconnect: true, enableNetworkSwitch: false, allowUnsupportedChain: true }));
});

function injectedFixture(authorized = true, manuallyDisconnected = false, walletChain = "0x413") {
  const calls: string[] = [];
  const account = "0x1212121212121212121212121212121212121212";
  const provider = {
    request: async ({ method }: { method: string }) => { calls.push(method); if (method === "eth_accounts") return authorized ? [account] : []; if (method === "eth_chainId") return walletChain; throw new Error(`Unexpected wallet prompt: ${method}`); },
    on: () => undefined,
    removeListener: () => undefined,
  } as unknown as EIP1193Provider;
  const storage = createStorage({ storage: { getItem: key => manuallyDisconnected && key === "wagmi.test-wallet.disconnected" ? "true" : null, setItem: () => undefined, removeItem: () => undefined } });
  const chain = defineChain({ id: 1043, name: "Testnet", nativeCurrency: { name: "BDAG", symbol: "BDAG", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.invalid"] } } });
  const config = createConfig({ chains: [chain], connectors: [injected({ target: { id: "test-wallet", name: "Test wallet", provider: () => provider }, shimDisconnect: true })], storage, transports: { [chain.id]: http("https://rpc.invalid") } });
  return { calls, account, config };
}

it.each(["0x413", "0x19e3b"])("restores an injected account without prompting or switching its selected network (%s)", async walletChain => {
  const { calls, account, config } = injectedFixture(true, false, walletChain);
  const connections = await reconnect(config);
  expect(connections[0]?.accounts).toEqual([account]);
  expect(connections[0]?.chainId).toBe(Number.parseInt(walletChain, 16));
  expect(config.state.status).toBe("connected");
  expect(calls.length).toBeGreaterThan(0);
  expect(calls.every(method => ["eth_accounts", "eth_chainId"].includes(method))).toBe(true);
});

it.each([false, true])("leaves an unapproved or explicitly disconnected wallet alone (manual disconnect: %s)", async manuallyDisconnected => {
  const { calls, config } = injectedFixture(manuallyDisconnected, manuallyDisconnected);
  expect(await reconnect(config)).toEqual([]);
  expect(config.state.status).toBe("disconnected");
  expect(calls.every(method => method === "eth_accounts")).toBe(true);
});
