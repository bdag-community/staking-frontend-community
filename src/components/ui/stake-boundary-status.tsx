export const StakeBoundaryStatus = ({
  reason,
  isPending,
}: {
  reason: string | null;
  isPending: boolean;
}) => reason && !isPending ? (
  <p className="mb-2 text-xs text-warning" role="status">{reason}</p>
) : null;
