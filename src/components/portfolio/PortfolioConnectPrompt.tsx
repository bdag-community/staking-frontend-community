import { LegacyStakingLink } from "@/components/legacy/LegacyStakingLink";
import { ConnectButton } from "@/components/wallet/ConnectButton";
import { StakingPageHero } from "@/components/layout/StakingPageHero";

export const PortfolioConnectPrompt = () => (
  <div className="page-shell">
    <StakingPageHero kind="portfolio" eyebrow="Your staking home" title="Portfolio" description="Connect the wallet that holds your BDAG positions to read balances, rewards, exit dates, and transaction history." />
    <section className="glass-card max-w-2xl p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary/25 bg-primary/10 text-xl text-primary" aria-hidden="true">↗</div>
        <div>
          <h2 className="text-xl font-semibold">Connect to view your portfolio</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The portfolio stays empty until the connected wallet returns real on-chain and indexed state.
          </p>
          <ConnectButton className="mt-6" size="lg" />
        </div>
      </div>
    </section>
    <div className="mt-6"><LegacyStakingLink /><p className="mt-3 text-sm text-muted-foreground">Manage older positions with unstake and claim only.</p></div>
  </div>
);
