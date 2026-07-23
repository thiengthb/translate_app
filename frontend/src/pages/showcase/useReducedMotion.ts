import { useEffect, useState } from "react";

/**
 * Tracks `prefers-reduced-motion`. Local to the showcase so the page stays
 * self-contained. Defaults to *not* reduced, so the full experience shows
 * unless the visitor has opted out.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}
