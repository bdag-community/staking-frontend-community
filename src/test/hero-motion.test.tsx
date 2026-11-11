import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHeroMotion } from "@/hooks/use-hero-motion";

function Harness() {
  const field = useHeroMotion<HTMLDivElement>();
  return <div ref={field} data-testid="hero" data-running="false" data-motion-paused="true" />;
}

describe("scroll-linked hero ornament", () => {
  let frames: Map<number, FrameRequestCallback>;
  let nextFrame: number;
  let intersection: (entries: { isIntersecting: boolean }[]) => void;
  let preferenceChanged: () => void;
  let reduced: boolean;
  let disconnect: ReturnType<typeof vi.fn>;
  let cancel: ReturnType<typeof vi.fn>;
  let hidden: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    frames = new Map(); nextFrame = 0; reduced = false;
    intersection = () => {}; preferenceChanged = () => {};
    disconnect = vi.fn();
    window.scrollY = 0;
    hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 800, width: 1200, x: 0, y: 76, top: 76, bottom: 876, left: 0, right: 1200,
      toJSON: () => ({}),
    });
    vi.stubGlobal("requestAnimationFrame", vi.fn((callback: FrameRequestCallback) => {
      const id = ++nextFrame; frames.set(id, callback); return id;
    }));
    cancel = vi.fn((id: number) => { frames.delete(id); });
    vi.stubGlobal("cancelAnimationFrame", cancel);
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof intersection) { intersection = callback; }
      observe() {}
      disconnect = disconnect;
    });
    vi.stubGlobal("matchMedia", () => ({
      get matches() { return reduced; },
      addEventListener: (_type: string, callback: () => void) => { preferenceChanged = callback; },
      removeEventListener: vi.fn(),
    }));
  });

  afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); window.scrollY = 0; });
  const flush = () => act(() => {
    const queued = [...frames.values()]; frames.clear(); queued.forEach(callback => callback(0));
  });
  const scroll = (value: number) => act(() => { window.scrollY = value; window.dispatchEvent(new Event("scroll")); });

  it("moves from resting to quarter progress and reverses when scrolling up", () => {
    const { getByTestId } = render(<Harness />); const field = getByTestId("hero");
    flush(); expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.0000");
    scroll(200); flush(); expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.2500");
    scroll(0); flush(); expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.0000");
  });

  it("coalesces scroll events into one frame and never runs an idle frame loop", () => {
    render(<Harness />); flush();
    scroll(100); scroll(150); scroll(200); expect(frames.size).toBe(1);
    flush(); expect(frames.size).toBe(0);
  });

  it("clamps negative and past-hero scroll to a bounded progress", () => {
    const { getByTestId } = render(<Harness />); const field = getByTestId("hero");
    scroll(-100); flush(); expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.0000");
    scroll(4000); flush(); expect(field.style.getPropertyValue("--hero-scroll")).toBe("1.0000");
  });

  it("pauses offscreen and hidden, then samples current scroll when visible again", () => {
    const { getByTestId } = render(<Harness />); const field = getByTestId("hero"); flush();
    act(() => intersection([{ isIntersecting: false }]));
    expect(field).toHaveAttribute("data-running", "false");
    scroll(400); expect(frames.size).toBe(0);
    act(() => intersection([{ isIntersecting: true }])); flush();
    expect(field).toHaveAttribute("data-running", "true");
    expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.5000");
    hidden.mockReturnValue(true); act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(field).toHaveAttribute("data-motion-paused", "true");
    scroll(600); expect(frames.size).toBe(0);
    hidden.mockReturnValue(false); act(() => document.dispatchEvent(new Event("visibilitychange"))); flush();
    expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.7500");
  });

  it("keeps a static frame for reduced motion and responds to preference changes", () => {
    reduced = true; const { getByTestId } = render(<Harness />); const field = getByTestId("hero");
    scroll(400); expect(frames.size).toBe(0);
    expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.0000");
    expect(field).toHaveAttribute("data-running", "false");
    reduced = false; act(() => preferenceChanged()); flush();
    expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.5000");
    reduced = true; act(() => preferenceChanged());
    expect(field.style.getPropertyValue("--hero-scroll")).toBe("0.0000");
  });

  it("recalculates after resize and cleans queued frames and listeners on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<Harness />); flush();
    act(() => window.dispatchEvent(new Event("resize"))); expect(frames.size).toBe(1);
    unmount(); expect(disconnect).toHaveBeenCalledOnce(); expect(cancel).toHaveBeenCalled();
    expect(frames.size).toBe(0); expect(remove).toHaveBeenCalledWith("scroll", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("resize", expect.any(Function));
    scroll(200); expect(frames.size).toBe(0);
  });
});
