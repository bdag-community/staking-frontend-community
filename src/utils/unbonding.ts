type BigIntish = bigint | string | number | boolean | null | undefined;

const toBigInt = (value: BigIntish): bigint => {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(Math.trunc(value));
  if (typeof value === "string" && value !== "") return BigInt(value);
  return 0n;
};

export interface UnbondingAmountParts {
  amount?: BigIntish;
  shares?: BigIntish;
}

export const getUnbondingPayoutAmount = (
  request: UnbondingAmountParts,
): bigint => toBigInt(request.amount);
