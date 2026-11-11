import { useEffect, useState } from "react";
import type { RefObject } from "react";

/** Resize-only geometry: no scroll-driven React renders or idle frame loop. */
export function useHeroViewport(ref: RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 1440, height: 760 });
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let disposed = false;
    const update = (width: number, height: number) => {
      if (disposed || !Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return;
      const next = { width: Math.round(width), height: Math.round(height) };
      setSize(previous => previous.width === next.width && previous.height === next.height ? previous : next);
    };
    const measure = () => { const rect = element.getBoundingClientRect(); update(rect.width, rect.height); };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width, entry.contentRect.height);
    });
    observer?.observe(element);
    if (!observer) window.addEventListener("resize", measure, { passive: true });
    return () => { disposed = true; observer?.disconnect(); if (!observer) window.removeEventListener("resize", measure); };
  }, [ref]);
  return size;
}
