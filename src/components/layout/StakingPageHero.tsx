import type { ReactNode } from "react";
import { ENV } from "@/config/env";

export type StakingArtKind = "pools" | "stake" | "portfolio" | "rewards" | "credentials" | "legacy";

function PoolsArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="104" /><path d="M160 56v208M56 160h208" /></g><g className="staking-art-nodes"><circle cx="160" cy="160" r="38" /><circle cx="160" cy="56" r="13" /><circle cx="250" cy="212" r="13" /><circle cx="70" cy="212" r="13" /></g><path className="staking-art-flow" d="M160 56a104 104 0 0 1 90 156" /></>;
}

function StakeArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="100" /><circle cx="160" cy="160" r="70" /></g><g className="staking-art-nodes"><path d="m160 112 42 24v48l-42 24-42-24v-48Z" /><path d="M145 145h24a15 15 0 0 1 0 30h-24M160 132v56" /></g><path className="staking-art-flow" d="M86 86c28 8 51 25 67 49" /></>;
}

function PortfolioArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="102" /><path d="M82 112h156M82 208h156" /></g><g className="staking-art-nodes"><rect x="82" y="112" width="156" height="96" rx="20" /><rect x="166" y="140" width="72" height="42" rx="12" /><circle cx="190" cy="161" r="7" /></g><path className="staking-art-flow" d="M104 112V94h100c19 0 34 8 34 18" /></>;
}

function RewardsArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="104" /><path d="M82 222h156M82 178h156M82 134h156" /></g><g className="staking-art-nodes"><circle cx="112" cy="194" r="13" /><circle cx="160" cy="158" r="15" /><circle cx="208" cy="116" r="17" /></g><path className="staking-art-flow" d="m88 222 62-58 42-34 42-64" /></>;
}

function CredentialsArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="104" /><path d="M70 160h180M160 56v208" /></g><g className="staking-art-nodes"><path d="M160 86c26 18 52 22 72 24v55c0 45-28 72-72 91-44-19-72-46-72-91v-55c20-2 46-6 72-24Z" /><circle cx="160" cy="158" r="28" /></g><path className="staking-art-flow" d="m145 159 11 11 22-26" /></>;
}

function LegacyArt() {
  return <><g className="staking-art-grid"><circle cx="160" cy="160" r="102" /><circle cx="160" cy="160" r="72" /></g><g className="staking-art-nodes"><path d="m160 116 38 22v44l-38 22-38-22v-44Z" /><path d="M146 150v-10a14 14 0 0 1 28 0v10M140 150h40v36h-40z" /></g><path className="staking-art-flow" d="M82 112a102 102 0 0 0 20 116M82 112l6 42 38-18" /></>;
}

const ART = {
  pools: { label: "pool network", Art: PoolsArt },
  stake: { label: "stake position", Art: StakeArt },
  portfolio: { label: "your position", Art: PortfolioArt },
  rewards: { label: "share growth", Art: RewardsArt },
  credentials: { label: "voting receipt", Art: CredentialsArt },
  legacy: { label: "protected exit", Art: LegacyArt },
} satisfies Record<StakingArtKind, { label: string; Art: () => React.JSX.Element }>;

export function StakingPageHero({ kind, eyebrow, title, description, action }: { kind: StakingArtKind; eyebrow: string; title: ReactNode; description: ReactNode; action?: ReactNode }) {
  const { label, Art } = ART[kind];
  return (
    <header className="staking-page-hero">
      <div className="min-w-0">
        {ENV.IS_TESTNET && (
          <span role="status" className="status-badge-primary mb-6 max-w-full">
            {ENV.NETWORK_LABEL} · {ENV.LEGACY_ONLY ? "exit only" : "test BDAG only"}
          </span>
        )}
        <p className="data-label text-primary">{eyebrow}</p>
        <h1 className="page-title mt-4">{title}</h1>
        <p className="page-lead">{description}</p>
        {action && <div className="mt-7">{action}</div>}
      </div>
      <div className="staking-art-visual" aria-hidden="true">
        <div className="staking-page-orb max-w-[18rem]" data-staking-art={kind}>
          <span className="staking-art-bloom" />
          <svg viewBox="0 0 320 320" className="staking-art" focusable="false"><Art /></svg>
          <span className="staking-art-label">{label}</span>
        </div>
      </div>
    </header>
  );
}
