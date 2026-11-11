import type { Address } from 'viem';
import { formatUnits } from 'viem';

export function formatCredentialWeight(value:bigint,domain:'mining'|'staking',chainId:number) {
  return formatUnits(value,domain==='staking' && chainId===1043 ? 24 : 18);
}

export function mergeCredentialPools(registered: readonly Address[], discovered: readonly Address[]): Address[] {
  return [...new Set([...registered, ...discovered].map(pool => pool.toLowerCase()))].sort() as Address[];
}

export function claimableVotes(ready: boolean, raw?: bigint, claimed?: bigint): bigint {
  return ready && raw !== undefined && claimed !== undefined && raw > claimed ? raw - claimed : 0n;
}

export function credentialErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/NothingToClaim/i.test(text)) return 'There are no new votes to claim for this period. Your voting power will refresh shortly.';
  if (/ClaimWindowClosed|InvalidEpoch/i.test(text)) return 'The voting period has changed. Refresh your voting power and try again.';
  if (/VotingUnavailable/i.test(text)) return 'Voting is not ready for this period yet. Please try again shortly.';
  if (/user rejected|user denied|request rejected/i.test(text)) return 'Request cancelled in your wallet. Nothing was submitted.';
  if (/InvalidList/i.test(text)) return 'The pool list could not be used. Refresh the page and try again.';
  if (/insufficient funds/i.test(text)) return 'You need a little BDAG in your wallet to cover the network fee.';
  if (/network|genesis|chain|account|wallet/i.test(text) && !/Contract Call|Docs:|Version:/i.test(text) && text.length < 240) return text;
  return 'The request could not be completed. Refresh your voting power and check your wallet before trying again.';
}
