import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const css = source("src/index.css");

describe("staking home atmosphere", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("reuses Community's unmodified cloud shape rather than baked-in staking artwork", async () => {
    expect(existsSync(resolve(process.cwd(), "public/hero-storm-b.webp"))).toBe(true);
    expect(createHash("sha256").update(readFileSync(resolve(process.cwd(), "public/hero-storm-b.webp"))).digest("hex")).toBe(
      "04c0f913c14dd9e1cae6155c73cc42dfe55081671f2ef6757a4cc8213a1aba51",
    );
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    expect(container.querySelector("img")).toHaveAttribute("src", "/hero-storm-b.webp");
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(container.querySelector("img")).toHaveAttribute("fetchpriority", "high");
    expect(container.querySelectorAll("feFuncR, feFuncG, feFuncB")).toHaveLength(3);
    expect(css).toMatch(/\.staking-hero-clouds\s*\{[^}]*opacity:\s*\.75[;\s]/);
  });

  it("keeps the decorative circular graph out of the accessibility and focus trees", async () => {
    expect(existsSync(resolve(process.cwd(), "src/components/home/StakingHeroBackdrop.tsx"))).toBe(true);
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    const decoration = container.querySelector(".staking-hero-backdrop");
    expect(decoration).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("focusable", "false");
    expect(container.querySelectorAll(".staking-hero-graph circle").length).toBeLessThan(35);
    expect(container.querySelectorAll(".staking-hero-graph circle").length).toBeGreaterThanOrEqual(8);
    expect(container.querySelectorAll("button, a, [tabindex]")).toHaveLength(0);
    expect(css).toMatch(/\.staking-hero-backdrop\s*\{[^}]*pointer-events:\s*none/);
  });

  it("blends into the page without the previous ruled edge and uses the Community bottom scrim", () => {
    const heroRule = css.match(/\.staking-hero\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(heroRule).not.toMatch(/border-block|box-shadow/);
    expect(css).not.toContain("background-image: url('/staking-hero-field.webp')");
    expect(css).toMatch(/\.staking-hero-scrim\s*\{[^}]*linear-gradient\(to top, #171e2c, rgb\(23 30 44 \/ \.4\), transparent\)/);
    expect(source("src/pages/HomePage.tsx")).toContain("<StakingHeroBackdrop />");
  });

  it("provides static reduced-motion circles and uses the shared event-driven motion controller", () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[^}]*\.staking-hero-linked-field[^}]*transform:\s*none/s);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.staking-hero-ring[^}]*animation:\s*none/);
    expect(css).toMatch(/data-motion-paused="true"[^}]*animation-play-state:\s*paused/s);
    const component = source("src/components/home/StakingHeroBackdrop.tsx");
    expect(component).toContain("useHeroMotion<HTMLDivElement>()");
    expect(component).toContain('data-running="false"');
    expect(component).not.toMatch(/requestAnimationFrame|setInterval|Math\.random|useState|visibilitychange/);
  });

  it("constantly rotates dotted rings joined by lines that meet their actual perimeters", async () => {
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    const groups = container.querySelectorAll('[data-hero-shape="circle"]');
    expect(groups).toHaveLength(14);
    expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("data-hero-count", String(groups.length));
    expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("data-small-shape-count", "6");
    expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("data-rotation", "slow");
    expect(container.querySelectorAll(".staking-hero-orbit, .staking-hero-centre")).toHaveLength(0);
    const radii = [...container.querySelectorAll(".staking-hero-ring")].map((ring) => ring.getAttribute("r"));
    expect(new Set(radii).size).toBeGreaterThan(5);
    expect(container.querySelectorAll(".staking-hero-graph *").length).toBeLessThan(80);
    expect(css).toMatch(/\.staking-hero-linked-field\s*\{[^}]*transform:[^}]*var\(--hero-scroll,\s*0\)/);
    expect(css).toMatch(/\.staking-hero-ring\s*\{[^}]*stroke-dasharray:/);
    expect(css).toMatch(/\.staking-hero-ring\s*\{[^}]*stroke-linecap:\s*round/);
    expect(css).toMatch(/\.staking-hero-ring\s*\{[^}]*animation:\s*staking-hero-ring-spin[^}]*linear[^}]*infinite/);
    const connectors = container.querySelectorAll(".staking-hero-connector");
    expect(connectors.length).toBeGreaterThanOrEqual(8);
    for (const connector of connectors) {
      for (const endpoint of [1, 2] as const) {
        const ringIndex = connector.getAttribute(endpoint === 1 ? "data-link-from" : "data-link-to");
        const group = container.querySelector(`[data-hero-ring="${ringIndex}"]`);
        const centre = group?.getAttribute("transform")?.match(/translate\(([\d.]+) ([\d.]+)\)/);
        expect(centre).not.toBeNull();
        const radius = Number(group?.querySelector(".staking-hero-ring")?.getAttribute("r"));
        const x = Number(connector.getAttribute(`x${endpoint}`));
        const y = Number(connector.getAttribute(`y${endpoint}`));
        expect(Math.hypot(x - Number(centre?.[1]), y - Number(centre?.[2]))).toBeCloseTo(radius, 3);
      }
    }
  });

  it("retains fourteen circles including six small ones and the slow spin speed", async () => {
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    const groups = [...container.querySelectorAll('[data-hero-shape="circle"]')];
    const slowerDurations = [80, 68, 76, 60, 72, 56, 52, 64];
    for (const index of slowerDurations.keys()) {
      expect(groups[index].getAttribute("style")).toContain(`--ring-duration: ${slowerDurations[index]}s`);
    }
    expect(groups.slice(8)).toHaveLength(6);
    for (const group of groups.slice(8)) expect(Number(group.querySelector(".staking-hero-ring")?.getAttribute("r"))).toBeLessThanOrEqual(16);
    const links = [...container.querySelectorAll(".staking-hero-connector")].map((link) => `${link.getAttribute("data-link-from")}-${link.getAttribute("data-link-to")}`);
    expect(links).toHaveLength(15);
    expect(css).toMatch(/\.staking-hero-network-drift\s*\{[^}]*48s/);
  });

  it("covers the left and right instead of masking away half the hero, including mobile", async () => {
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("data-hero-layout", "full-width");
    const positions=[...container.querySelectorAll('[data-hero-shape="circle"]')].map(g=>g.getAttribute("transform")!.match(/translate\(([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number));
    expect(positions.some(([x])=>x<1440*.25)).toBe(true);
    expect(positions.some(([x])=>x>1440*.8)).toBe(true);
    expect(positions.some(([,y])=>y<760*.2)).toBe(true);
    expect(positions.some(([,y])=>y>760*.8)).toBe(true);
    expect(css).not.toContain("transparent 32%");
    expect(css).not.toContain("transparent 20%");
    expect(css).toMatch(/@media\s*\(max-width:\s*767px\)[^}]*staking-hero-graph[^}]*opacity:\s*\.7/);
  });

  it("never displays two headline phrases together during a transition", () => {
    const block=css.split("@keyframes staking-hero-title-cycle")[1]!.split("@media")[0];
    const stops=[...block.matchAll(/([\d.% ,]+)\{\s*opacity:\s*([\d.]+)/g)].flatMap(([,percentages,value])=>percentages.split(',').map(p=>({at:parseFloat(p)/100,value:Number(value)}))).sort((a,b)=>a.at-b.at);
    expect(stops.length).toBeGreaterThan(4);
    const visible=(phase:number)=>{
      const after=stops.findIndex(s=>s.at>phase);if(after<1)return stops[0].value>0;
      const a=stops[after-1],b=stops[after];return a.value>0||b.value>0;
    };
    for(let tick=0;tick<12000;tick++){
      const phase=tick/12000;
      expect([phase,(phase+2/3)%1,(phase+1/3)%1].filter(visible).length,`overlap at ${tick}ms`).toBeLessThanOrEqual(1);
    }
  });

  it("reflows round circles on real container resize from ultrawide to mobile", async () => {
    let resize: (entries: {contentRect:{width:number;height:number}}[])=>void = () => {};
    vi.stubGlobal("ResizeObserver", class { constructor(callback:typeof resize){resize=callback;} observe(){} disconnect(){} });
    const { StakingHeroBackdrop } = await import("@/components/home/StakingHeroBackdrop");
    const { container } = render(<StakingHeroBackdrop />);
    for(const {width,height} of [{width:2560,height:1364},{width:390,height:844},{width:320,height:720}]){
      act(()=>resize([{contentRect:{width,height}}]));
      expect(container.querySelector(".staking-hero-graph")).toHaveAttribute("viewBox",`0 0 ${width} ${height}`);
      const groups=[...container.querySelectorAll('[data-hero-shape="circle"]')];
      expect(groups).toHaveLength(14);
      const positions=groups.map(group=>{
        const [x,y]=group.getAttribute("transform")!.match(/translate\(([\d.]+) ([\d.]+)\)/)!.slice(1).map(Number);
        const r=Number(group.querySelector(".staking-hero-ring")!.getAttribute("r"));
        expect(x-r).toBeGreaterThan(0);expect(x+r).toBeLessThan(width);
        expect(y-r).toBeGreaterThan(0);expect(y+r).toBeLessThan(height);
        return [x,y];
      });
      expect(positions.some(([x])=>x<width*.25)).toBe(true);
      expect(positions.some(([x])=>x>width*.75)).toBe(true);
    }
  });

  it("keeps the four-second heading cadence and makes only Earn rewards white", () => {
    expect(css).toMatch(/\.staking-hero-title-phrase:nth-child\(2\)\s*\{[^}]*color:\s*#ffd23f/);
    expect(css).toMatch(/\.staking-hero-title-phrase:nth-child\(3\)\s*\{[^}]*color:\s*#fff[;\s]/);
    expect(css).toMatch(/\.staking-hero-title-phrase\s*\{[^}]*staking-hero-title-cycle 12s/);
    expect(css).toMatch(/\.staking-hero-title-phrase:nth-child\(2\)\s*\{[^}]*animation-delay:\s*-8s/);
    expect(css).toMatch(/\.staking-hero-title-phrase:nth-child\(3\)\s*\{[^}]*animation-delay:\s*-4s/);
  });
});
