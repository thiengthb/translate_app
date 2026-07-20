import { designer, socials } from "./portfolio-data";

/** Contact + footer, shared by both pages. Anchored by #contact for the nav. */
export function PortfolioFooter() {
  const year = 2026; // static — this is a page footer, not a live clock

  return (
    <footer className="pf-footer" id="contact">
      <div className="pf-wrap">
        <div className="pf-contact pf-reveal">
          <div>
            <span className="pf-kicker">問い合わせ · Contact</span>
            <h2 className="pf-contact-title">
              Let's make something
              <br />
              that helps people learn.
            </h2>
            <a className="pf-contact-mail pf-inklink" href={`mailto:${designer.email}`}>
              {designer.email}
            </a>
          </div>

          <nav className="pf-socials" aria-label="Elsewhere">
            {socials.map((s) => (
              <a key={s.label} className="pf-social" href={s.href}>
                {s.label}
                <span>{s.handle}</span>
              </a>
            ))}
          </nav>
        </div>

        <div className="pf-footer-base">
          <span>
            © {year} {designer.name}. Crafted with sumi ink & sakura.
          </span>
          <span>Hanabun · 花文 — 日本語を、やさしく</span>
        </div>
      </div>
    </footer>
  );
}
