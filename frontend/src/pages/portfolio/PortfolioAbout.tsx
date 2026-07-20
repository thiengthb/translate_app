import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { PortfolioNav } from "./PortfolioNav";
import { PortfolioFooter } from "./PortfolioFooter";
import { designer, skills, timeline, tools } from "./portfolio-data";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";
import "./portfolio.css";

export default function PortfolioAbout() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const prev = document.title;
    document.title = `About — ${designer.name}`;
    window.scrollTo(0, 0);
    return () => {
      document.title = prev;
    };
  }, []);

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
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );
    items.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reduced]);

  return (
    <div className="pf-root" ref={rootRef}>
      <PortfolioNav />

      <div className="pf-shell">
        <div className="pf-wrap">
          {/* ============================ HERO ============================ */}
          <header className="pf-about-hero">
            <div className="pf-reveal">
              <Link to="/" className="pf-backlink">
                ← Back to work
              </Link>
              <h1 className="pf-about-title">
                Hi, I'm <span className="pf-em">Rin</span>. I design the quiet parts of learning.
              </h1>
              <p className="pf-about-intro">
                For seven years I've drawn interfaces for one stubborn, wonderful problem: how do you help
                someone learn a language through a screen, without the screen getting in the way?
              </p>
              <p className="pf-about-intro">
                My answer keeps coming back to restraint. Fewer choices, gentler pacing, and moments of
                delight small enough to earn a smile but never big enough to distract. Hanabun is where that
                philosophy lives now.
              </p>
            </div>

            <div className="pf-portrait pf-reveal" aria-label="Portrait — a sakura motif standing in for Rin">
              <span className="pf-portrait-glyph" aria-hidden="true">
                凛
              </span>
              <span className="pf-portrait-tag" aria-hidden="true">
                相沢 凛
              </span>
            </div>
          </header>
        </div>

        <div className="pf-wrap">
          <hr className="pf-rule" />
        </div>

        {/* =========================== STORY =========================== */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-cols pf-reveal">
              <div className="pf-cols-label">
                <small>物語 · Story</small>
                How I got here
              </div>
              <div>
                <p className="pf-about-intro">
                  I started out nudging pixels at a tiny studio — the kind of place where you learn the whole
                  craft because there's no one else to hand it to. Buttons, illustration, a little code. I
                  loved that everything I made had to actually work.
                </p>
                <p className="pf-about-intro">
                  Language learning found me by accident. A friend was building flashcards and asked for help;
                  I stayed for three years. Watching a beginner go from guessing at かな to reading a menu is
                  the most satisfying feedback loop I've found in design.
                </p>
                <p className="pf-about-intro">
                  Today I work independently, mostly on Hanabun. I still redraw the buttons.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="pf-wrap">
          <hr className="pf-rule" />
        </div>

        {/* ========================= TIMELINE ========================= */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-cols">
              <div className="pf-cols-label pf-reveal">
                <small>道 · Michi · the path</small>
                A few seasons
              </div>
              <div className="pf-timeline">
                {timeline.map((m) => (
                  <div className="pf-milestone pf-reveal" key={m.year}>
                    <div className="pf-milestone-when">
                      <span className="pf-milestone-season" aria-hidden="true">
                        {m.season}
                      </span>
                      <span className="pf-milestone-year">{m.year}</span>
                    </div>
                    <div>
                      <h3 className="pf-milestone-title">{m.title}</h3>
                      <p className="pf-milestone-body">{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div className="pf-wrap">
          <hr className="pf-rule" />
        </div>

        {/* ========================== CRAFT ========================== */}
        <section className="pf-section">
          <div className="pf-wrap">
            <div className="pf-cols pf-reveal">
              <div className="pf-cols-label">
                <small>仕事 · Craft</small>
                What I do
              </div>
              <div>
                <div className="pf-chipwrap" style={{ marginBottom: "1.6rem" }}>
                  {skills.map((s) => (
                    <span className="pf-chip" key={s}>
                      {s}
                    </span>
                  ))}
                </div>
                <span className="pf-kicker" style={{ display: "block", marginBottom: "0.9rem" }}>
                  Tools I reach for
                </span>
                <div className="pf-chipwrap">
                  {tools.map((t) => (
                    <span className="pf-chip pf-chip--tool" key={t}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <PortfolioFooter />
    </div>
  );
}
