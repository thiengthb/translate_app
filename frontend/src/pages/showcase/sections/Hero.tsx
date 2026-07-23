import { Suspense, lazy, useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import { ArrowRight, Sparkles, Flame } from "lucide-react";
import { brand, heroStats } from "../showcase-data";

const SakuraGL = lazy(() => import("../SakuraGL"));

/** Hero: WebGL petals + GSAP load choreography + mascot with live chips. */
export default function Hero({ reduced, onJump }: { reduced: boolean; onJump: (id: string) => void }) {
  const rootRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return; // content is visible by default; skip motion
    let safety = 0;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { y: 16, opacity: 0, duration: 0.7 }, 0.1);
      tl.from(".hero-title .sk-line > span", { yPercent: 122, duration: 1, stagger: 0.12, ease: "power4.out" }, 0.25);
      tl.from(".hero-sub", { y: 20, opacity: 0, duration: 0.8 }, 0.95);
      tl.from(".hero-cta > *", { y: 18, opacity: 0, duration: 0.7, stagger: 0.1 }, 1.1);
      tl.from(".hero-stat", { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, 1.25);
      tl.from(".hero-figure", { scale: 0.9, opacity: 0, duration: 1, ease: "back.out(1.4)" }, 0.5);
      tl.from(".hero-chip", { scale: 0, opacity: 0, duration: 0.6, stagger: 0.12, ease: "back.out(1.8)" }, 1.3);
      tl.from(".hero-cue", { opacity: 0, duration: 0.6 }, 1.6);
      gsap.to(".hero-figure-inner", { y: -14, duration: 3, ease: "sine.inOut", repeat: -1, yoyo: true });
      safety = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 4200);
    }, rootRef);
    return () => {
      if (safety) clearTimeout(safety);
      ctx.revert();
    };
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      id="top"
      className="relative z-10 flex min-h-[100svh] flex-col justify-center overflow-hidden px-4 pb-16 pt-28 sm:px-8"
    >
      {!reduced && (
        <Suspense fallback={null}>
          <SakuraGL />
        </Suspense>
      )}

      {/* soft glow blobs */}
      <div
        className="sk-glow pointer-events-none absolute right-[-10%] top-[-18%] h-[520px] w-[520px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,143,171,0.45), transparent 70%)" }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute bottom-[-12%] left-[-8%] h-[420px] w-[420px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(155,227,201,0.32), transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        {/* copy */}
        <div>
          <span className="hero-eyebrow sk-glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--sk-pink-deep)]">
            <Sparkles className="h-4 w-4" /> {brand.glyph} · {brand.tagline}
          </span>

          <h1 className="hero-title sk-display mt-6 text-5xl leading-[0.98] text-[color:var(--sk-ink)] sm:text-6xl lg:text-7xl">
            <span className="sk-line">
              <span>Learn Japanese,</span>
            </span>
            <span className="sk-line">
              <span>
                one <span className="sk-grad">blossom</span>
              </span>
            </span>
            <span className="sk-line">
              <span>at a time.</span>
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-xl text-lg text-[color:var(--sk-ink-soft)]">{brand.blurb}</p>

          <div className="hero-cta mt-8 flex flex-wrap items-center gap-4">
            <Link
              to={brand.startHref}
              className="group inline-flex items-center gap-2 rounded-full bg-[color:var(--sk-pink)] px-7 py-3.5 text-base font-bold text-white shadow-[0_18px_40px_-16px_rgba(233,79,131,0.9)] transition-transform hover:-translate-y-0.5"
            >
              Start learning free
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={() => onJump("features")}
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sk-pink-wash)] bg-white/60 px-6 py-3.5 text-base font-semibold text-[color:var(--sk-ink)] backdrop-blur transition-colors hover:border-[color:var(--sk-pink)]"
            >
              Explore features
            </button>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
            {heroStats.map((s) => (
              <li key={s.label} className="hero-stat">
                <div className="sk-display text-2xl text-[color:var(--sk-pink-deep)]">{s.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-[color:var(--sk-ink-soft)]">
                  {s.label}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* mascot figure */}
        <div className="hero-figure relative mx-auto hidden max-w-sm lg:block">
          <div className="hero-figure-inner relative">
            <div
              className="sk-glow absolute inset-6 rounded-[42%]"
              style={{ background: "radial-gradient(circle, rgba(255,107,157,0.4), transparent 70%)" }}
              aria-hidden="true"
            />
            <img
              src="/hanabun-girl.png"
              alt="Hanabun mascot"
              className="relative w-full drop-shadow-[0_30px_40px_rgba(233,79,131,0.35)]"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
              }}
            />
            <div className="hero-chip sk-glass absolute -left-4 top-10 flex items-center gap-2 rounded-2xl px-4 py-3">
              <Flame className="h-6 w-6 text-[color:var(--sk-pink)]" />
              <div>
                <div className="sk-display text-xl leading-none">7</div>
                <div className="text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">day streak</div>
              </div>
            </div>
            <div className="hero-chip sk-glass absolute -right-2 bottom-16 rounded-2xl px-4 py-3 text-center">
              <div className="sk-display text-xl leading-none text-[color:var(--sk-mint)]">Lv.8</div>
              <div className="text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">+120 EXP</div>
            </div>
          </div>
        </div>
      </div>

      {/* scroll cue */}
      <button
        onClick={() => onJump("features")}
        className="hero-cue absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--sk-ink-soft)]"
        aria-label="Scroll to features"
      >
        Scroll
        <span
          className="sk-cue-tail h-9 w-px"
          style={{ background: "linear-gradient(to bottom, var(--sk-pink), transparent)" }}
        />
      </button>
    </section>
  );
}
