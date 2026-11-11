import { cn } from "@/lib/utils";

/** Matches Development's route skeleton without implying balances are loaded. */
export function PageLoadingSkeleton({ status = "Loading staking page…", className }: { status?: string; className?: string }) {
  return <div className={cn("min-h-[55svh] space-y-8", className)} role="status" aria-busy="true" aria-label="Loading page" data-page-loading-skeleton="">
    <span className="sr-only">{status}</span>
    <div aria-hidden="true" className="grid items-center gap-10 border-b border-border pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.55fr)]">
      <div className="space-y-4">
        <div className="h-3 w-36 rounded-full bg-secondary" />
        <div className="h-12 max-w-xl rounded-xl bg-secondary/80" />
        <div className="h-5 max-w-2xl rounded-lg bg-secondary/60" />
        <div className="h-5 max-w-lg rounded-lg bg-secondary/60" />
      </div>
      <div className="mx-auto aspect-square w-full max-w-72 rounded-[2rem] border border-primary/15 bg-card/60" />
    </div>
    <div aria-hidden="true" className="grid gap-5 md:grid-cols-2">
      <div className="h-56 rounded-2xl border border-border bg-card/50" />
      <div className="h-56 rounded-2xl border border-border bg-card/50" />
    </div>
  </div>;
}
