import { ENV } from "@/config/env";
import { useWallet } from "@/hooks/use-wallet";
import { useWalletNetworkValidation } from "@/hooks/use-wallet-network-validation";
export function NetworkNotice() {
  const { isConnected } = useWallet();
  const network = useWalletNetworkValidation();
  if (!isConnected || (network.isGenesisValid && network.chainId === Number(ENV.CHAIN.ID))) return null;
  const isMismatch = network.chainId !== Number(ENV.CHAIN.ID)
    || Boolean(network.genesisHash && !network.isGenesisValid && !network.genesisError);
  return (
    <div role="status" className="mx-auto mt-5 w-[calc(100%-2rem)] max-w-[1376px] rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm leading-6 text-warning">
      {isMismatch ? (
        <>Your wallet network does not match <strong>{ENV.NETWORK_LABEL}</strong>. Select the matching network and RPC in your wallet before signing.</>
      ) : network.isGenesisChecking ? (
        "Checking your wallet’s network…"
      ) : (
        <>
          Unable to verify your wallet network right now. The RPC may be busy or temporarily unavailable. Signing remains disabled until verification succeeds.
          <button type="button" className="ml-2 rounded px-2 py-1 font-semibold underline underline-offset-4 focus-visible:outline focus-visible:outline-2" onClick={() => void network.retry()}>
            Retry network check
          </button>
        </>
      )}
      {!network.isGenesisChecking && (
        <details className="mt-2">
          <summary className="cursor-pointer">Connection details</summary>
          <p className="mt-2 break-all font-mono text-xs">RPC: {ENV.CHAIN.RPC_URL}<br />Chain ID: {ENV.CHAIN.ID}<br />Genesis: {ENV.CHAIN.EXPECTED_GENESIS_HASH}</p>
        </details>
      )}
    </div>
  );
}
