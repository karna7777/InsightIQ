"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scroll reveal — fades + rises an element in the first time it enters the
 * viewport, then disconnects (reveals are one-shot, never re-hiding on scroll
 * back). Pair the returned ref with the `.reveal` class in globals.css, which
 * carries the animation and the reduced-motion opt-out; this hook only flips
 * `data-revealed` when the element is seen.
 *
 * Fails open: if IntersectionObserver is unavailable (SSR / very old engine) we
 * mark it revealed immediately so content is never stuck invisible.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options?: {
  /** Fraction of the element visible before revealing. Default 0.15. */
  threshold?: number;
  /** Extra delay (ms) before the reveal, for staged sequences. Default 0. */
  delay?: number;
}) {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || revealed) return;

    let timer: number | undefined;

    // Fail open where IntersectionObserver is unavailable (SSR / very old
    // engine): reveal on the next frame so content is never stuck invisible.
    // Deferring past the effect body also avoids a synchronous cascading render.
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(raf);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          timer = window.setTimeout(() => setRevealed(true), options?.delay ?? 0);
        }
      },
      { threshold: options?.threshold ?? 0.15 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [revealed, options?.threshold, options?.delay]);

  return { ref, revealed } as const;
}
