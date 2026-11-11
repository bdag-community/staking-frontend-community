import { useEffect, useRef } from "react";

/** Scroll-scrubbed decoration only: one paint per input frame, no idle loop. */
export function useHeroMotion<T extends HTMLElement>() {
  const fieldRef = useRef<T>(null);

  useEffect(() => {
    const element = fieldRef.current;
    if (!element) return;
    const field = element;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = true;
    let running = false;
    let disposed = false;
    let frame: number | null = null;

    field.style.setProperty("--hero-scroll", "0.0000");

    function paint() {
      frame = null;
      if (disposed || !running) return;
      const height = Math.max(1, field.getBoundingClientRect().height);
      const position = Number.isFinite(window.scrollY) ? window.scrollY : 0;
      const progress = Math.max(0, Math.min(1, position / height));
      field.style.setProperty("--hero-scroll", progress.toFixed(4));
    }

    function schedule() {
      if (!disposed && running && frame === null) frame = requestAnimationFrame(paint);
    }

    function syncVisibility() {
      if (disposed) return;
      running = inView && !document.hidden && !media.matches;
      field.dataset.running = String(running);
      field.dataset.motionPaused = String(!running);
      if (!running && frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      if (media.matches) field.style.setProperty("--hero-scroll", "0.0000");
      else schedule();
    }

    const observer = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(
      ([entry]) => { inView = entry?.isIntersecting ?? false; syncVisibility(); },
    );
    observer?.observe(field);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    document.addEventListener("visibilitychange", syncVisibility);
    media.addEventListener("change", syncVisibility);
    syncVisibility();

    return () => {
      disposed = true;
      if (frame !== null) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", syncVisibility);
      media.removeEventListener("change", syncVisibility);
    };
  }, []);

  return fieldRef;
}
