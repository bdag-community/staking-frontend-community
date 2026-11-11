import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StakingPageHero } from "@/components/layout/StakingPageHero";

vi.mock("@/config/env", () => ({ ENV: { IS_TESTNET:true, NETWORK_LABEL: "DAO rehearsal devnet", CHAIN: { ID: "8008" } } }));

describe("staking page illustration system", () => {
  it("renders a round, page-specific glass instrument without animation", () => {
    const { container } = render(
      <StakingPageHero
        kind="pools"
        eyebrow="Open market"
        title="Choose a pool with evidence."
        description="Compare verified pool figures."
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Choose a pool with evidence.",
    );
    expect(container.querySelector('[data-staking-art="pools"]')).not.toBeNull();
    expect(container.querySelector(".staking-page-orb")).not.toBeNull();
    expect(container.querySelector(".animate-spin")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "DAO rehearsal devnet · test BDAG only",
    );
  });

  it("uses the shared eighty-percent hero-art footprint", () => {
    const { container } = render(
      <StakingPageHero
        kind="portfolio"
        eyebrow="Your staking home"
        title="Portfolio"
        description="Review your position."
      />,
    );

    expect(container.querySelector(".staking-page-orb")).toHaveClass("max-w-[18rem]");
  });
});
