import { useHeroMotion } from "@/hooks/use-hero-motion";

const phrases = ["Choose your pool", "Stake your BDAG", "Earn rewards"] as const;

/** One accessible heading; three overlapping two-line visual phrases reserve
 * the same natural height without timers, layout measurement or announcements. */
export function StakingHeroHeadline() {
  const headline = useHeroMotion<HTMLHeadingElement>();
  return <h1 ref={headline} className="landing-hero-title staking-hero-headline mt-5 max-w-[13ch]" data-running="false" data-motion-paused="true">
    <span className="sr-only">{phrases.join(" / ")}</span>
    <span className="staking-hero-title-cycle" aria-hidden="true">
      {phrases.map((phrase) => <span key={phrase} className="staking-hero-title-phrase">
        {phrase.slice(0, phrase.lastIndexOf(" ") + 1)}<br />{phrase.slice(phrase.lastIndexOf(" ") + 1)}
      </span>)}
    </span>
  </h1>;
}
