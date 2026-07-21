import { useMemo } from "react";
import type { CSSProperties } from "react";

/**
 * Ambient CSS petal field drifting across the whole viewport (behind the
 * content). Uses the app's real petal art. Hidden under reduced-motion via
 * `.sk-petals` in showcase.css. Kept sparse + GPU-transformed for 60fps.
 */
const ART = [
  "/cherry/petals/petal-a.png",
  "/cherry/petals/petal-d.png",
  "/cherry/petals/bloom-a.png",
  "/cherry/petals/bloom-b.png",
  "/cherry/petals/bloom-c.png",
];

export default function Petals({ count = 14 }: { count?: number }) {
  // Deterministic-ish spread computed once so petals don't re-shuffle on
  // every render (and never during animation).
  const petals = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      const size = 16 + ((i * 37) % 34); // 16–50px
      const left = (i * 71) % 100;
      const delay = ((i * 53) % 180) / 10; // 0–18s
      const dur = 16 + ((i * 29) % 16); // 16–32s
      const art = ART[i % ART.length];
      return { size, left, delay, dur, art };
    });
  }, [count]);

  return (
    <div className="sk-petals" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="sk-petal"
          style={
            {
              left: `${p.left}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundImage: `url(${p.art})`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.dur}s`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
