/** Display estimate for a NEW request only. Existing recorded release times win.
 * Both retained V2 and its versioned-clock successor use next epoch end + period.
 * API timestamps are milliseconds; contract durations and this result are seconds.
 */
export function estimateWithdrawalRelease({ chainTime, nextEpochStartTime, unbondingPeriod }: {
  chainTime: number | undefined; nextEpochStartTime: number; unbondingPeriod: number;
}): number | undefined {
  if (chainTime === undefined || !Number.isSafeInteger(chainTime) || chainTime < 0 ||
      !Number.isSafeInteger(nextEpochStartTime) || nextEpochStartTime <= 0 || nextEpochStartTime % 1000 !== 0 ||
      !Number.isSafeInteger(unbondingPeriod) || unbondingPeriod <= 0) return undefined;
  const boundary = nextEpochStartTime / 1000;
  const release = boundary + unbondingPeriod;
  return chainTime < boundary && Number.isSafeInteger(release) ? release : undefined;
}
