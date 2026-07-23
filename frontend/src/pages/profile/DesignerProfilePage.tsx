import {
  Suspense,
  lazy,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";

import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import { crafts, designer, honors, socials, stats, works } from "./designer-profile-data";
import "./designer-profile.css";

const YozakuraGL = lazy(() => import("./YozakuraGL"));

/** Nav / section anchors. */
const SECTIONS = [
  { id: "craft", label: "Craft" },
  { id: "work", label: "Work" },
  { id: "recognition", label: "Recognition" },
  { id: "contact", label: "Contact" },
];

/**
 * Yozakura (夜桜) — Night Bloom.
 *
 * An awwwards-style designer profile for a fictional Tokyo UI/UX designer,
 * rendered full-bleed (no app shell) with its own scoped dark identity.
 * Motion: a GSAP page-load timeline in the hero + IntersectionObserver scroll
 * reveals + Three.js glowing night petals, all reduced-motion aware. The
 * signature is a five-petal sakura "craft bloom" whose petals map one-to-one
 * onto the designer's disciplines.
 */
export default function DesignerProfilePage() {
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCraft, setActiveCraft] = useState<number | null>(null);

  // Honest document title while mounted.
  useEffect(() => {
    const prev = document.title;
    document.title = `${designer.name} — ${designer.role}`;
    return () => {
      document.title = prev;
    };
  }, []);

  // Nav "stuck" state on scroll.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => nav.classList.toggle("is-stuck", window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll reveals + the craft-bloom "is-live" trigger (IntersectionObserver —
  // cheap, and works without GSAP too).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(".yz-reveal, .yz-craft"));
    // craft section reveals via `is-live` (triggers the petal bloom); the rest
    // via `is-in`.
    const reveal = (el: HTMLElement) =>
      el.classList.add(el.classList.contains("yz-craft") ? "is-live" : "is-in");
    if (reduced) {
      items.forEach(reveal);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          reveal(e.target as HTMLElement);
          io.unobserve(e.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    items.forEach((el) => io.observe(el));
    // Safety net: some runtimes (a backgrounded/stalled renderer, or the
    // in-app preview pane, which run with visibilityState "hidden") throttle
    // IntersectionObserver to zero so it never fires — reveal everything after
    // a beat so content can never stay permanently invisible.
    const safety = window.setTimeout(() => {
      items.forEach(reveal);
      io.disconnect();
    }, 4500);
    return () => {
      clearTimeout(safety);
      io.disconnect();
    };
  }, [reduced]);

  // Orchestrated hero page-load timeline. useLayoutEffect so hidden states are
  // set before paint (no flash of un-animated content).
  useLayoutEffect(() => {
    if (reduced) return;
    let safety = 0;
    const ctx = gsap.context(() => {
      const lines = gsap.utils.toArray<HTMLElement>(".yz-hero-name .yz-line > span");
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      tl.from(".yz-moon-disc", { y: -40, opacity: 0, scale: 0.9, duration: 1.6, ease: "power2.out" }, 0);
      tl.from(".yz-hero-eyebrow", { y: 18, opacity: 0, duration: 0.7 }, 0.3);
      tl.from(lines, { yPercent: 118, duration: 1, stagger: 0.12, ease: "power4.out" }, 0.4);
      tl.from(".yz-hero-role", { y: 20, opacity: 0, duration: 0.7 }, 0.95);
      tl.from(".yz-hero-sub", { y: 20, opacity: 0, duration: 0.7 }, 1.05);
      tl.from(".yz-avail", { y: 16, opacity: 0, duration: 0.6 }, 1.2);
      tl.from(".yz-hero-actions > *", { y: 20, opacity: 0, duration: 0.65, stagger: 0.1 }, 1.3);
      tl.from(
        ".yz-orb",
        { scale: 0.6, opacity: 0, duration: 1.1, ease: "back.out(1.5)" },
        0.5,
      );
      tl.from(".yz-orb-tag", { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(1.7)" }, 1.4);
      tl.from(".yz-scrollcue", { opacity: 0, duration: 0.6 }, 1.6);

      // Safety net if frames are throttled (backgrounded tab / stalled ticker).
      safety = window.setTimeout(() => {
        if (tl.progress() < 1) tl.progress(1);
      }, 4200);

      // Gentle moon parallax on scroll.
      const moon = rootRef.current?.querySelector<HTMLElement>(".yz-moon-disc");
      if (moon) {
        const onScroll = () => {
          const y = window.scrollY;
          if (y < window.innerHeight) moon.style.transform = `translateY(${y * 0.18}px)`;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        (moon as HTMLElement & { _cleanup?: () => void })._cleanup = () =>
          window.removeEventListener("scroll", onScroll);
      }
    }, rootRef);

    return () => {
      if (safety) clearTimeout(safety);
      const moon = rootRef.current?.querySelector<HTMLElement & { _cleanup?: () => void }>(".yz-moon-disc");
      moon?._cleanup?.();
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

  const jump = (id: string) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="yz-root" ref={rootRef}>
      {/* ============================ NAV ============================ */}
      <nav className="yz-nav" ref={navRef} aria-label="Profile sections">
        <Link className="yz-brand" to="/dashboard" aria-label="Back to Hanabun">
          <span className="yz-brand-mark" aria-hidden="true">
            華
          </span>
          <span className="yz-brand-name">
            {designer.name}
            <small>Profile</small>
          </span>
        </Link>

        <div className="yz-nav-links">
          {SECTIONS.map((s) => (
            <button key={s.id} className="yz-nav-link" onClick={() => jump(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <div className="yz-nav-actions">
          <Link className="yz-nav-gear" to="/profile" aria-label="Account settings">
            <GearIcon />
            <span>Settings</span>
          </Link>
          <button
            className={`yz-nav-toggle${menuOpen ? " is-open" : ""}`}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span /> <span /> <span />
          </button>
        </div>
      </nav>

      {/* mobile menu */}
      <div className={`yz-menu${menuOpen ? " is-open" : ""}`} aria-hidden={!menuOpen}>
        {SECTIONS.map((s) => (
          <button key={s.id} onClick={() => jump(s.id)}>
            {s.label}
          </button>
        ))}
        <Link to="/profile" onClick={() => setMenuOpen(false)}>
          Account settings
        </Link>
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
          Back to app
        </Link>
        <span className="yz-menu-ja">夜桜 · yozakura</span>
      </div>

      <div className="yz-shell">
        {/* ============================ HERO ============================ */}
        <section className="yz-hero">
          {!reduced && (
            <Suspense fallback={null}>
              <YozakuraGL />
            </Suspense>
          )}
          <div className="yz-moon-disc" aria-hidden="true" />

          <div className="yz-hero-grid">
            <div className="yz-hero-copy">
              <div className="yz-hero-eyebrow">
                <span className="yz-ja">{designer.eyebrowJa}</span>
                <span className="yz-ro">{designer.eyebrowRomaji}</span>
              </div>

              <h1 className="yz-hero-name">
                <span className="yz-line">
                  <span>Hana</span>
                </span>
                <span className="yz-line">
                  <span className="yz-em">Mizuno</span>
                </span>
              </h1>

              <p className="yz-hero-role">
                {designer.role}
                <span className="yz-dot" aria-hidden="true" />
                <span className="yz-loc">{designer.based}</span>
              </p>

              <p className="yz-hero-sub">
                <span className="yz-hl">{designer.statement}</span>
              </p>

              <div className="yz-avail">
                <span className="yz-pulse" aria-hidden="true" />
                {designer.availability}
              </div>

              <div className="yz-hero-actions">
                <a
                  ref={ctaRef}
                  className="yz-btn"
                  href="#contact"
                  onClick={(e) => {
                    e.preventDefault();
                    jump("contact");
                  }}
                >
                  Get in touch
                  <span className="yz-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
                <button
                  className="yz-inklink"
                  onClick={() => jump("work")}
                  style={{ cursor: "pointer" }}
                >
                  View selected work ↓
                </button>
              </div>
            </div>

            <div className="yz-hero-figure">
              <div className="yz-orb">
                <span className="yz-orb-ring" aria-hidden="true" />
                <span className="yz-orb-glyph" aria-hidden="true">
                  華
                </span>
              </div>
              <span className="yz-orb-tag">
                <b>{designer.nameJa}</b> · {designer.basedJa}
              </span>
            </div>
          </div>

          <div className="yz-scrollcue">
            Scroll
            <span aria-hidden="true" />
          </div>
        </section>

        {/* ============================ STATS ============================ */}
        <section className="yz-section" style={{ paddingBottom: 0 }}>
          <div className="yz-wrap">
            <div className="yz-stats">
              {stats.map((s) => (
                <div className="yz-stat yz-reveal" key={s.label}>
                  <div className="yz-stat-glyph" aria-hidden="true">
                    {s.glyph}
                  </div>
                  <div className="yz-stat-value">{s.value}</div>
                  <div className="yz-stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================ CRAFT ============================ */}
        <section className="yz-section" id="craft">
          <div className="yz-wrap">
            <div className="yz-craft">
              <div className="yz-bloom-wrap yz-reveal">
                <CraftBloom activeCraft={activeCraft} onHover={setActiveCraft} />
              </div>

              <div className="yz-craft-copy">
                <span className="yz-kicker yz-kicker--jp">五弁 · five petals</span>
                <h2 className="yz-section-title">
                  One bloom, <span className="yz-em">five crafts</span>
                </h2>
                <p className="yz-craft-lead">
                  A cherry blossom has exactly five petals. So does the way I work — each
                  petal a discipline, its reach the years I've spent in it. Hover a petal, or a row.
                </p>
                <ul className="yz-craft-list">
                  {crafts.map((c, i) => (
                    <li
                      key={c.key}
                      className={`yz-craft-item${activeCraft === i ? " is-active" : ""}`}
                      onMouseEnter={() => setActiveCraft(i)}
                      onMouseLeave={() => setActiveCraft(null)}
                    >
                      <span className="yz-craft-item-ja" aria-hidden="true">
                        {c.labelJa}
                      </span>
                      <span className="yz-craft-item-main">
                        <b>{c.label}</b>
                        <span>{c.note}</span>
                      </span>
                      <span className="yz-craft-item-pct">{c.level}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <div className="yz-wrap">
          <hr className="yz-rule" />
        </div>

        {/* ============================ WORK ============================ */}
        <section className="yz-section" id="work">
          <div className="yz-wrap">
            <div className="yz-section-head">
              <div className="yz-reveal">
                <span className="yz-kicker yz-kicker--jp">選抜作品</span>
                <h2 className="yz-section-title">Selected work</h2>
              </div>
              <span className="yz-section-note yz-reveal">Three projects · 2023—2025</span>
            </div>

            <div className="yz-works">
              {works.map((w) => (
                <article className="yz-work yz-reveal" key={w.title}>
                  <div className="yz-work-visual" data-tint={w.tint}>
                    <span className="yz-work-index" aria-hidden="true">
                      {w.index}
                    </span>
                    <span className="yz-work-year">{w.year}</span>
                    <span className="yz-work-glyph" aria-hidden="true">
                      {w.glyph}
                    </span>
                    <span className="yz-work-metric">{w.metric}</span>
                  </div>
                  <div className="yz-work-body">
                    <h3 className="yz-work-title">{w.title}</h3>
                    <span className="yz-work-gloss">{w.gloss}</span>
                    <p className="yz-work-summary">{w.summary}</p>
                    <div className="yz-work-tags">
                      {w.tags.map((t) => (
                        <span className="yz-tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ========================= RECOGNITION ========================= */}
        <section className="yz-section" id="recognition">
          <div className="yz-wrap">
            <div className="yz-section-head">
              <div className="yz-reveal">
                <span className="yz-kicker yz-kicker--jp">評価</span>
                <h2 className="yz-section-title">Recognition</h2>
              </div>
            </div>
            <div className="yz-honors yz-reveal">
              {honors.map((h) => (
                <div className="yz-honor" key={h.title}>
                  <span className="yz-honor-year">{h.year}</span>
                  <span className="yz-honor-title">{h.title}</span>
                  <span className="yz-honor-org">{h.org}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ============================ CONTACT ============================ */}
      <footer className="yz-footer" id="contact">
        <div className="yz-wrap">
          <div className="yz-contact">
            <div className="yz-reveal">
              <span className="yz-kicker yz-kicker--jp">連絡</span>
              <h2 className="yz-contact-title">
                Let's make <br />
                something <span className="yz-em">bloom.</span>
              </h2>
              <a className="yz-contact-mail" href={`mailto:${designer.email}`}>
                {designer.email}
              </a>
            </div>
            <div className="yz-socials yz-reveal">
              {socials.map((s) => (
                <a
                  className="yz-social"
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {s.label}
                  <span>{s.handle}</span>
                </a>
              ))}
            </div>
          </div>

          <div className="yz-footer-base">
            <span>© 2026 {designer.name} · Fictional profile · Hanabun</span>
            <span>
              <Link to="/profile">Account settings</Link>
              {"  ·  "}
              <Link to="/dashboard">Back to app</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------------
   The signature: a five-petal sakura bloom rendered in SVG. Each petal
   maps to one craft; its length encodes mastery. Petals scale-in on
   scroll (staggered) and glow when their petal — or the matching legend
   row — is hovered.
   --------------------------------------------------------------------- */
function CraftBloom({
  activeCraft,
  onHover,
}: {
  activeCraft: number | null;
  onHover: (i: number | null) => void;
}) {
  // Precompute each petal path once. Petal points up from the flower centre
  // (200,200); `k` stretches it by mastery so higher levels reach further.
  const petals = useMemo(
    () =>
      crafts.map((c, i) => {
        const k = 1.2 + ((c.level - 80) / 20) * 0.8; // ~1.4 … 1.84 for 85…96
        return { d: petalPath(200, 200, k), rot: i * 72 };
      }),
    [],
  );

  // A ring of gold stamens at the centre.
  const stamens = useMemo(() => {
    const out: Array<{ x2: number; y2: number; cx: number; cy: number }> = [];
    const N = 9;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const len = 30 + (i % 2) * 8;
      out.push({
        x2: 200 + Math.cos(a) * len,
        y2: 200 + Math.sin(a) * len,
        cx: 200 + Math.cos(a) * (len + 4),
        cy: 200 + Math.sin(a) * (len + 4),
      });
    }
    return out;
  }, []);

  return (
    <svg className="yz-bloom" viewBox="0 0 400 400" role="img" aria-label="Five-petal skill bloom: UI Design, Design Systems, UX and Product, Interaction and Motion, and Prototyping.">
      <defs>
        <radialGradient id="yz-petal-grad" cx="50%" cy="78%" r="78%">
          <stop offset="0%" stopColor="#ffd3e6" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#ff8fb8" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c25a86" stopOpacity="0.45" />
        </radialGradient>
        <radialGradient id="yz-petal-grad-hot" cx="50%" cy="78%" r="78%">
          <stop offset="0%" stopColor="#fff2f8" />
          <stop offset="50%" stopColor="#ff6fa5" />
          <stop offset="100%" stopColor="#ff9ec7" />
        </radialGradient>
        <radialGradient id="yz-center-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d8" />
          <stop offset="60%" stopColor="#f0c674" />
          <stop offset="100%" stopColor="#c9992f" />
        </radialGradient>
      </defs>

      {/* petals */}
      {petals.map((p, i) => (
        <g
          key={crafts[i].key}
          className={`yz-petal-g${activeCraft === i ? " is-active" : ""}`}
          style={{ "--rot": `${p.rot}deg`, transitionDelay: `${i * 0.09}s` } as CSSProperties}
          onMouseEnter={() => onHover(i)}
          onMouseLeave={() => onHover(null)}
        >
          <path className="yz-petal-shape" d={p.d} />
        </g>
      ))}

      {/* stamens + center */}
      <g aria-hidden="true">
        {stamens.map((s, i) => (
          <line key={i} className="yz-stamen" x1={200} y1={200} x2={s.x2} y2={s.y2} />
        ))}
        {stamens.map((s, i) => (
          <circle key={`d${i}`} className="yz-stamen-dot" cx={s.cx} cy={s.cy} r={3.2} />
        ))}
        <circle className="yz-bloom-center" cx={200} cy={200} r={22} />
      </g>
    </svg>
  );
}

/**
 * Build one upward-pointing sakura petal path with its base at the flower
 * centre (cx,cy). `k` stretches the petal along its length. Local petal
 * coordinates come from the same teardrop-with-notch shape used by the GL
 * petal texture, so the motif is consistent across the page.
 */
function petalPath(cx: number, cy: number, k: number): string {
  // local (lx, ly): base at ly=44, tip at ly=-46 (notch at the tip)
  const P = (lx: number, ly: number) => `${(cx + lx).toFixed(1)} ${(cy + (ly - 44) * k).toFixed(1)}`;
  return [
    `M ${P(0, 44)}`,
    `C ${P(34, 24)}, ${P(30, -30)}, ${P(6, -46)}`,
    `Q ${P(0, -40)}, ${P(-6, -46)}`,
    `C ${P(-30, -30)}, ${P(-34, 24)}, ${P(0, 44)}`,
    "Z",
  ].join(" ");
}

/** Small settings gear (kept inline so the page carries no icon dependency). */
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 2v2.2M12 19.8V22M22 12h-2.2M4.2 12H2M19.07 4.93l-1.56 1.56M6.49 17.51l-1.56 1.56M19.07 19.07l-1.56-1.56M6.49 6.49L4.93 4.93"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
