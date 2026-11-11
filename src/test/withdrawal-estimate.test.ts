import { expect, it } from 'vitest';
import { estimateWithdrawalRelease } from '@/lib/withdrawal-estimate';

it('uses the canonical next boundary in milliseconds plus the actual seconds-based unbonding period', () => {
  expect(estimateWithdrawalRelease({ chainTime: 7400, nextEpochStartTime: 8800000, unbondingPeriod: 5400 })).toBe(14200);
  // A non-integral-epoch override is added, not rounded down to a boundary.
  expect(estimateWithdrawalRelease({ chainTime: 7400, nextEpochStartTime: 8800000, unbondingPeriod: 2000 })).toBe(10800);
});
it('does not manufacture a fresh boundary from stale or unavailable clock metadata', () => {
  for (const chainTime of [undefined, 8800, 9000, NaN]) expect(estimateWithdrawalRelease({ chainTime, nextEpochStartTime: 8800000, unbondingPeriod: 5400 })).toBeUndefined();
  expect(estimateWithdrawalRelease({ chainTime: 7400, nextEpochStartTime: 0, unbondingPeriod: 5400 })).toBeUndefined();
  expect(estimateWithdrawalRelease({ chainTime: 7400, nextEpochStartTime: 8800001, unbondingPeriod: 5400 })).toBeUndefined();
});
