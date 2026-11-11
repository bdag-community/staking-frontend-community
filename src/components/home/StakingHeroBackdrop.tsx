import { useId } from "react";
import type { CSSProperties } from "react";
import { useHeroMotion } from "@/hooks/use-hero-motion";
import { useHeroViewport } from "@/hooks/use-hero-viewport";

// Ring centres and connectors share one transform, so scrolling and ambient
// movement never pull the links away from their circle perimeters.
const rings = [
  { x: .79, y: .25, mobileX: .78, mobileY: .15, radius: 102, delay: -2, duration: 80 },
  { x: .36, y: .18, mobileX: .20, mobileY: .38, radius: 66, delay: -8, duration: 68 },
  { x: .10, y: .50, mobileX: .78, mobileY: .70, radius: 76, delay: -4, duration: 76 },
  { x: .66, y: .58, mobileX: .18, mobileY: .86, radius: 32, delay: -11, duration: 60 },
  { x: .91, y: .73, mobileX: .42, mobileY: .13, radius: 42, delay: -6, duration: 72 },
  { x: .16, y: .13, mobileX: .13, mobileY: .12, radius: 26, delay: -13, duration: 56 },
  { x: .36, y: .82, mobileX: .54, mobileY: .88, radius: 20, delay: -5, duration: 52 },
  { x: .58, y: .10, mobileX: .16, mobileY: .58, radius: 17, delay: -9, duration: 64 },
  { x: .91, y: .12, mobileX: .88, mobileY: .43, radius: 13, delay: -3, duration: 56 },
  { x: .04, y: .82, mobileX: .10, mobileY: .76, radius: 12, delay: -12, duration: 60 },
  { x: .48, y: .47, mobileX: .51, mobileY: .53, radius: 15, delay: -7, duration: 68 },
  { x: .72, y: .86, mobileX: .88, mobileY: .90, radius: 16, delay: -16, duration: 72 },
  { x: .19, y: .72, mobileX: .61, mobileY: .34, radius: 14, delay: -10, duration: 64 },
  { x: .94, y: .44, mobileX: .70, mobileY: .83, radius: 11, delay: -18, duration: 52 },
] as const;
const links = [[5, 1], [1, 7], [7, 0], [0, 8], [0, 13], [13, 4], [4, 3], [3, 10], [10, 1], [10, 2], [2, 12], [12, 6], [12, 9], [6, 11], [11, 4]] as const;

/** Same cloud pixels as Community; only their luminance-to-brand ramp changes.
 * The small SVG graph is deterministic and entirely separate from wallet state. */
export function StakingHeroBackdrop() {
  const filterId = `staking-clouds-${useId().replace(/:/g, "")}`;
  const backdrop = useHeroMotion<HTMLDivElement>();
  const { width, height } = useHeroViewport(backdrop);
  const mobile = width < 768;
  const scale = Math.max(.58, Math.min(1.35, width / 1440, height / 760));
  const circles = rings.map(ring => {
    const radius = ring.radius * scale;
    const margin = radius + 16;
    return { ...ring, radius,
      x: Math.max(margin, Math.min(width - margin, (mobile ? ring.mobileX : ring.x) * width)),
      y: Math.max(margin, Math.min(height - margin, (mobile ? ring.mobileY : ring.y) * height)),
    };
  });

  return <div ref={backdrop} className="staking-hero-backdrop" aria-hidden="true" data-running="false" data-motion-paused="true">
    <svg width="0" height="0" className="absolute" focusable="false">
      <defs><filter id={filterId} colorInterpolationFilters="sRGB">
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.090196 1" />
          <feFuncG type="table" tableValues="0.117647 0.823529" />
          <feFuncB type="table" tableValues="0.172549 0.247059" />
        </feComponentTransfer>
      </filter></defs>
    </svg>
    <img className="staking-hero-clouds" src={`${import.meta.env.BASE_URL}hero-storm-b.webp`} alt="" width="1672" height="941" {...{ fetchpriority: "high" }} decoding="async" style={{ filter: `url(#${filterId})` }} />
    <svg className="staking-hero-graph" data-hero-count="14" data-small-shape-count="6" data-rotation="slow" data-hero-layout="full-width" viewBox={`0 0 ${width} ${height}`} fill="none" focusable="false">
      <g className="staking-hero-linked-field"><g className="staking-hero-network-drift">
        {links.map(([from, to]) => {
          const start = circles[from];
          const end = circles[to];
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const distance = Math.hypot(dx, dy);
          return <line key={`${from}-${to}`} className="staking-hero-connector" data-link-from={from} data-link-to={to}
            x1={start.x + dx * start.radius / distance} y1={start.y + dy * start.radius / distance}
            x2={end.x - dx * end.radius / distance} y2={end.y - dy * end.radius / distance} />;
        })}
        {circles.map((ring, index) => <g key={index} data-hero-shape="circle" data-hero-ring={index} transform={`translate(${ring.x} ${ring.y})`} style={{
          "--ring-delay": `${ring.delay}s`, "--ring-duration": `${ring.duration}s`, "--ring-direction": index % 2 ? "reverse" : "normal",
        } as CSSProperties}>
          <circle className="staking-hero-ring" r={ring.radius} />
          <g className="staking-hero-ring-light"><circle className="staking-hero-glint" cy={-ring.radius} r="2.5" /></g>
        </g>)}
      </g></g>
    </svg>
    <div className="staking-hero-scrim" />
  </div>;
}
