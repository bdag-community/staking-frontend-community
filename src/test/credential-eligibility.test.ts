import { describe, expect, it } from 'vitest';
import { claimableVotes, credentialErrorMessage, mergeCredentialPools, formatCredentialWeight } from '@/lib/credential-eligibility';

describe('voting claim eligibility', () => {
  it('normalizes precision in the pinned testnet staking ledger for display only',()=>{
    expect(formatCredentialWeight(330000000000000000000000000n,'staking',1043)).toBe('330');
    expect(formatCredentialWeight(330000000000000000000000000n,'staking',1404)).toBe('330');
    expect(formatCredentialWeight(1000000000000000000n,'mining',1043)).toBe('1');
  });
  it('includes a newly staked pool even when no pools are registered', () => {
    expect(mergeCredentialPools([], ['0x0000000000000000000000000000000000000001']))
      .toEqual(['0x0000000000000000000000000000000000000001']);
  });
  it('sorts and deduplicates the complete pool list for the contract', () => {
    expect(mergeCredentialPools(['0x00000000000000000000000000000000000000AA'], ['0x0000000000000000000000000000000000000001', '0x00000000000000000000000000000000000000aa']))
      .toEqual(['0x0000000000000000000000000000000000000001', '0x00000000000000000000000000000000000000aa']);
  });
  it('only offers the unclaimed delta and fails closed for incomplete reads', () => {
    expect(claimableVotes(true, 100n, 0n)).toBe(100n);
    expect(claimableVotes(true, 100n, 60n)).toBe(40n);
    expect(claimableVotes(true, 100n, 100n)).toBe(0n);
    expect(claimableVotes(true, 50n, 100n)).toBe(0n);
    expect(claimableVotes(false, 100n, 0n)).toBe(0n);
    expect(claimableVotes(true, undefined, 0n)).toBe(0n);
  });
  it('shows a short explanation instead of the raw contract trace', () => {
    const message = credentialErrorMessage(new Error('The contract function claim reverted. Error: NothingToClaim() Contract Call: address: 0x123'));
    expect(message).toMatch(/no new votes/i);
    expect(message).not.toMatch(/0x123|Contract Call/);
    expect(credentialErrorMessage(new Error('ClaimWindowClosed()'))).toMatch(/refresh/i);
    expect(credentialErrorMessage(new Error('User rejected the request.'))).toMatch(/cancelled/i);
  });
});
