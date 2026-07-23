import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * Scroll-into-view reveal helpers, built on IntersectionObserver — the
 * standard, battery-efficient API for this. Both hooks reveal immediately
 * under reduced motion.
 *
 * NOTE ON VERIFICATION: the project's in-app browser pane renders pages with
 * `document.visibilityState === "hidden"`, which makes the browser throttle
 * IntersectionObserver, requestAnimationFrame AND scroll events all to zero —
 * so no scroll-driven animation (this, Framer, GSAP, count-ups) can be observed
 * there. That is a pane limitation, not a code one: on any real, visible page
 * these fire normally. Verify reveals in a real browser tab, not the pane.
 */

/** Trigger slightly before the element is fully on-screen. */
const ROOT_MARGIN = "0px 0px -12% 0px";
const THRESHOLD = 0.15;
/**
 * Last-resort reveal: if the observer never fires (a stalled/backgrounded
 * renderer throttles IO to zero — see the note above), reveal everything so
 * content can never stay permanently invisible. Long enough that a normal
 * user's scroll-triggered stagger runs well before it.
 */
const SAFETY_MS = 5000;

/**
 * Toggle `.is-in` on every `.sk-reveal` descendant of `rootRef` as it enters
 * the viewport (once each). Under reduced motion, all reveal immediately.
 */
export function useScrollReveal(rootRef: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".sk-reveal"));
    if (reduced) {
      items.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: ROOT_MARGIN, threshold: THRESHOLD },
    );
    items.forEach((el) => io.observe(el));
    const safety = window.setTimeout(() => {
      items.forEach((el) => el.classList.add("is-in"));
      io.disconnect();
    }, SAFETY_MS);
    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, [rootRef, reduced]);
}

/**
 * Component-level "has this element been scrolled into view yet?" — returns a
 * ref to attach and a boolean that latches `true` once, then stops observing.
 */
export function useInViewOnce<T extends Element>(reduced = false) {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(reduced);

  useEffect(() => {
    if (reduced) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: ROOT_MARGIN, threshold: THRESHOLD },
    );
    io.observe(el);
    const safety = window.setTimeout(() => {
      setInView(true);
      io.disconnect();
    }, SAFETY_MS);
    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, [reduced]);

  return [ref, inView] as const;
}
