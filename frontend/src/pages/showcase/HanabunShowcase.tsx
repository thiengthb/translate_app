import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
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
 * `.sk-showcase`. Composed from modular sections; motion via GSAP (hero) +
 * Framer Motion (reveals/tilt) + Three.js (petals), all reduced-motion aware.
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

  const jump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <MotionConfig reducedMotion="user">
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
    </MotionConfig>
  );
}
