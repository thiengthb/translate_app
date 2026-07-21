import { useEffect, useRef } from "react";
import Petals from "./sections/Petals";
import Nav from "./sections/Nav";
import Hero from "./sections/Hero";
import Features from "./sections/Features";
import LivePreview from "./sections/LivePreview";
import Roles from "./sections/Roles";
import CTAFooter from "./sections/CTAFooter";
import { useReducedMotion } from "./useReducedMotion";
import { brand } from "./showcase-data";
import "./showcase.css";

/**
 * Hanabun — Awwwards-style Sakura showcase landing page.
 *
 * Standalone + public: renders its own layout (no app shell), scoped under
 * `.sk-showcase`. Motion is GSAP (hero) + native IntersectionObserver +
 * CSS (scroll reveals) + Three.js (petals), all reduced-motion aware.
 */
export default function HanabunShowcase() {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const prev = document.title;
    document.title = `${brand.name} — ${brand.tagline}`;
    return () => {
      document.title = prev;
    };
  }, []);

  // Scroll reveals: toggle `.is-in` on every `.sk-reveal` as it enters view.
  // Native IO (unlike Framer's whileInView here) fires reliably.
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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced]);

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div ref={rootRef} className="sk-showcase">
      <Petals />
      <Nav onJump={jump} />
      <main>
        <Hero reduced={reduced} onJump={jump} />
        <Features reduced={reduced} />
        <LivePreview reduced={reduced} />
        <Roles />
        <CTAFooter onJump={jump} />
      </main>
    </div>
  );
}
