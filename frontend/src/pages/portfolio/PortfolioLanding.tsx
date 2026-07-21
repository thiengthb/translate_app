import { Suspense, lazy, useEffect, useLayoutEffect, useRef, type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import { PortfolioNav } from "./PortfolioNav";
import { PortfolioFooter } from "./PortfolioFooter";
import { designer, process, works } from "./portfolio-data";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import "./portfolio.css";

const SakuraPetalsGL = lazy(() => import("./SakuraPetalsGL"));

gsap.registerPlugin(ScrollTrigger);

export default function PortfolioLanding() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const kanjiRef = useRef<HTMLDivElement | null>(null);
  const brushRef = useRef<SVGPathElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const reduced = usePrefersReducedMotion();
  const { hash } = useLocation();

  // Keep the document title honest while this page is mounted.
  useEffect(() => {
    const prev = document.title;
    document.title = `${designer.name} — ${designer.role}`;
    return () => {
      document.title = prev;
    };
  }, []);

  // Arriving from /about via /#work etc. — scroll to the section.
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    const t = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [hash]);

  // Scroll-reveal (IntersectionObserver — cheap, works without GSAP too).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".pf-reveal"));
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
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced]);

  // Orchestrated load + scroll motion (GSAP). useLayoutEffect so initial
  // hidden states are set before paint — no flash of un-animated content.
  useLayoutEffect(() => {
    if (reduced) return;
    let safety = 0;
    const ctx = gsap.context(() => {
      // --- page-load timeline ---
      const lines = gsap.utils.toArray<HTMLElement>(".pf-hero-title .pf-line > span");
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (kanjiRef.current) {
        gsap.set(kanjiRef.current, { "--pf-bloom": 0, opacity: 0, scale: 1.06 });
        tl.to(kanjiRef.current, { opacity: 1, scale: 1, "--pf-bloom": 1, duration: 1.7, ease: "power2.out" }, 0.1);
      }

      tl.from(".pf-hero-eyebrow", { y: 18, opacity: 0, duration: 0.7 }, 0.35);
      tl.from(lines, { yPercent: 115, duration: 1, stagger: 0.12, ease: "power4.out" }, 0.4);

      if (brushRef.current) {
        const len = brushRef.current.getTotalLength();
        gsap.set(brushRef.current, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(brushRef.current, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut" }, 0.9);
      }

      tl.from(".pf-hero-sub", { y: 20, opacity: 0, duration: 0.8 }, 1);
      tl.from(".pf-hero-actions > *", { y: 20, opacity: 0, duration: 0.7, stagger: 0.1 }, 1.15);
      tl.from(".pf-hero-seal", { scale: 0, rotate: -40, opacity: 0, duration: 0.7, ease: "back.out(1.7)" }, 1.2);
      tl.from(".pf-scrollcue", { opacity: 0, duration: 0.6 }, 1.5);

      // Safety net: the intro hides the hero and reveals it via the ticker.
      // If frames are ever throttled (backgrounded tab, stalled ticker),
      // snap to the finished state rather than leaving the hero invisible.
      safety = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 4000);

      // --- kanji drifts on scroll (depth) ---
      if (kanjiRef.current) {
        gsap.to(kanjiRef.current, {
          yPercent: 16,
          ease: "none",
          scrollTrigger: { trigger: ".pf-hero", start: "top top", end: "bottom top", scrub: true },
        });
      }

      // --- work screenshots drift subtly as they pass through the viewport ---
      gsap.utils.toArray<HTMLElement>(".pf-work-shot").forEach((g) => {
        gsap.fromTo(
          g,
          { yPercent: -8 },
          {
            yPercent: 8,
            ease: "none",
            scrollTrigger: { trigger: g, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    }, rootRef);

    return () => {
      if (safety) clearTimeout(safety);
      ctx.revert();
    };
  }, [reduced]);

  // Magnetic primary CTA (fine pointers only).
  useEffect(() => {
    const btn = ctaRef.current;
    if (!btn || reduced) return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const onMove = (e: PointerEvent) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      gsap.to(btn, { x: mx * 0.28, y: my * 0.4, duration: 0.5, ease: "power3.out" });
    };
    const onLeave = () => gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1, 0.45)" });
    btn.addEventListener("pointermove", onMove);
    btn.addEventListener("pointerleave", onLeave);
    return () => {
      btn.removeEventListener("pointermove", onMove);
      btn.removeEventListener("pointerleave", onLeave);
    };
  }, [reduced]);

  return (
    <div className="pf-root" ref={rootRef}>
      <PortfolioNav />

      <div className="pf-shell">
        {/* ============================= HERO ============================= */}
        <section className="pf-hero">
          {!reduced && (
            <Suspense fallback={null}>
              <SakuraPetalsGL />
            </Suspense>
          )}

          <div className="pf-hero-grid">
            <div className="pf-hero-copy">
              <div className="pf-hero-eyebrow">
                <span className="pf-ja">{designer.nameJa}</span>
                <span className="pf-ro">Portfolio · 2026</span>
              </div>

              <h1 className="pf-hero-title">
                <span className="pf-line">
                  <span>Building solutions</span>
                </span>
                <span className="pf-line">
                  <span>
                    that <span className="pf-em">connect</span> technology
                  </span>
                </span>
                <span className="pf-line">
                  <span>and culture.</span>
                </span>
              </h1>

              <svg className="pf-brushline" viewBox="0 0 360 26" preserveAspectRatio="none" aria-hidden="true">
                <path ref={brushRef} d="M4 17 C 70 4, 150 26, 210 12 S 320 2, 356 14" />
              </svg>

              <p className="pf-hero-sub">{designer.heroSub}</p>

              <div className="pf-hero-actions">
                <a
                  ref={ctaRef}
                  className="pf-btn"
                  href="#work"
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById("work")
                      ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
                  }}
                >
                  View work
                  <span className="pf-arrow" aria-hidden="true">
                    ↓
                  </span>
                </a>
                <Link className="pf-inklink" to="/about">
                  About Akira →
                </Link>
              </div>
            </div>

            <div className="pf-hero-figure">
              <span className="pf-hero-seal" aria-hidden="true">
                作品集
              </span>
              <div className="pf-hero-kanji" ref={kanjiRef} aria-hidden="true">
                橋
              </div>
              <span className="pf-hero-gloss" aria-hidden="true">
                橋 · kakehashi
              </span>
            </div>
          </div>

          <div className="pf-scrollcue">
            Scroll
            <span aria-hidden="true" />
          </div>
        </section>

        {/* ========================= PHILOSOPHY ========================= */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-ma">
              <span className="pf-eyebrow pf-reveal">
                間
                <small>Ma · negative space</small>
              </span>
              <div className="pf-ma-body pf-reveal">
                <p className="pf-ma-statement">
                  A good interface knows when to step back. I design for <span className="pf-em">間</span> —
                  the breathing room between elements, the calm that lets people focus on what matters.
                </p>
                <p className="pf-ma-note">
                  Less interface, more understanding. Every component has to earn the space it takes, or it
                  gets cut. I put frontend performance first, layouts that hold up across every device, and an
                  experience that always feels intuitive.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="pf-wrap">
          <hr className="pf-rule" />
        </div>

        {/* ========================= SELECTED WORK ========================= */}
        <section className="pf-section" id="work">
          <div className="pf-wrap">
            <div className="pf-section-head">
              <div className="pf-reveal">
                <span className="pf-kicker pf-jp">選抜作品</span>
                <h2 className="pf-section-title">Selected work</h2>
              </div>
              <span className="pf-section-count pf-reveal">Two projects · 2025—2026</span>
            </div>

            <div className="pf-works">
              {works.map((w, i) => (
                <article className="pf-work pf-reveal" key={w.title}>
                  <div className="pf-work-visual" data-tint={w.tint}>
                    <img className="pf-work-shot" src={w.image} alt={`${w.title} — project screenshot`} />
                    <span className="pf-work-seal" aria-hidden="true">
                      <span>{w.glyph}</span>
                    </span>
                    <div className="pf-work-chip" style={{ "--_p": `${58 + i * 12}%` } as CSSProperties}>
                      <b>{w.chip}</b>
                      <i aria-hidden="true" />
                    </div>
                  </div>

                  <div className="pf-work-body">
                    <span className="pf-work-index">{w.index}</span>
                    <div>
                      <h3 className="pf-work-title">
                        {w.title}
                        <span className="pf-work-gloss">{w.gloss}</span>
                      </h3>
                      <p className="pf-work-summary">{w.summary}</p>
                      <div className="pf-tags">
                        {w.roleTags.map((t) => (
                          <span className="pf-tag" key={t}>
                            {t}
                          </span>
                        ))}
                      </div>
                      <div className="pf-work-foot">
                        <Link className="pf-inklink" to="/about">
                          View details →
                        </Link>
                        <span className="pf-work-year">{w.year}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ========================== APPROACH ========================== */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-approach pf-reveal">
              <span className="pf-eyebrow">
                書き順
                <small>Kakijun · stroke order</small>
              </span>
              <p className="pf-approach-lead">
                Every interface, like every character, is built <span className="pf-em">one stroke at a
                time</span> — in the right order.
              </p>
              <div className="pf-steps">
                {process.map((s) => (
                  <div className="pf-step" key={s.numeral}>
                    <span className="pf-step-numeral" aria-hidden="true">
                      {s.numeral}
                    </span>
                    <span className="pf-step-kanji">
                      {s.kanji}
                      <small>{s.romaji}</small>
                    </span>
                    <span className="pf-step-label">{s.label}</span>
                    <p className="pf-step-body">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ======================== ABOUT TEASER ======================== */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-teaser pf-reveal">
              <div>
                <span className="pf-kicker pf-jp">私について</span>
                <h2 className="pf-teaser-title">A developer writing code — and building a bridge to Japan.</h2>
                <Link className="pf-btn pf-btn--ghost" to="/about">
                  Learn more
                  <span className="pf-arrow" aria-hidden="true">
                    →
                  </span>
                </Link>
              </div>
              <span className="pf-ma-figure" aria-hidden="true">
                橋
              </span>
            </div>
          </div>
        </section>
      </div>

      <PortfolioFooter />
    </div>
  );
}
