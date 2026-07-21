import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

import { PortfolioNav } from "./PortfolioNav";
import { PortfolioFooter } from "./PortfolioFooter";
import akiraPortrait from "@/assets/portfolio/akira-portrait.png";
import { designer, skills, story, tools } from "./portfolio-data";
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
                ← Back to home
              </Link>
              <h1 className="pf-about-title">
                Hello, I'm <span className="pf-em">Akira</span>. I design the bridge between systems and
                people.
              </h1>
              <p className="pf-about-intro">
                I was born in Khanh Hoa and now study at university in Ho Chi Minh City. In every project, I
                devote my full focus to frontend performance, designs that hold up across every device, and
                keeping the interface clean and intuitive.
              </p>
            </div>

            <div className="pf-portrait pf-reveal">
              <img className="pf-portrait-shot" src={akiraPortrait} alt={`${designer.name} — portrait`} />
              <span className="pf-portrait-tag" aria-hidden="true">
                黒凪 明
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
                {story.map((p) => (
                  <p className="pf-about-intro" key={p.slice(0, 24)}>
                    {p}
                  </p>
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
