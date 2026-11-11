import { formatCountdown } from '@/lib/utils';

interface EpochCountdownProps {
  epoch: number;
  timeRemaining: number;
  isLoading?: boolean;
  error?: string | null;
  isAwaitingConfirmation?: boolean;
}

export function EpochCountdown({ epoch, timeRemaining, isLoading = false, error = null, isAwaitingConfirmation = false }: EpochCountdownProps) {
  return <div>
    <p className="text-sm text-muted-foreground">Voting epoch</p>
    {error ? <p role="status" className="text-sm font-medium">Epoch clock unavailable. Retrying shortly.</p> :
      isLoading ? <p role="status" className="text-sm text-muted-foreground">Reading the current epoch…</p> :
      isAwaitingConfirmation ? <p role="status" className="text-sm font-medium">Waiting for the next confirmed epoch</p> :
      <p className="text-xl font-bold">Next epoch {epoch + 1} in {formatCountdown(timeRemaining)}</p>}
    <p className="mt-1 max-w-sm text-xs text-muted-foreground">Rewards accrue as your pool earns blocks. Each confirmed epoch updates voting eligibility.</p>
  </div>;
}
