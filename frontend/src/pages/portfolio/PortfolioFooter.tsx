import { designer, socials } from "./portfolio-data";

/** Contact + footer, shared by both pages. Anchored by #contact for the nav. */
export function PortfolioFooter() {
  const year = 2026; // static — this is a page footer, not a live clock

  return (
    <footer className="pf-footer" id="contact">
      <div className="pf-wrap">
        <div className="pf-contact pf-reveal">
          <div>
            <span className="pf-kicker pf-jp">問い合わせ</span>
            <h2 className="pf-contact-title">
              Let's build something
              <br />
              that connects people.
            </h2>
            <a className="pf-contact-mail pf-inklink" href={`mailto:${designer.email}`}>
              {designer.email}
            </a>
          </div>

          <nav className="pf-socials" aria-label="Other links">
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
            © {year} {designer.name} ({designer.realName}).
          </span>
          <span className="pf-jp">架け橋 — 日本とベトナムをつなぐ</span>
        </div>
      </div>
    </footer>
  );
}
