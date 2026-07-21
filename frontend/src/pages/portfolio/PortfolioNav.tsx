import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { designer } from "./portfolio-data";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

/**
 * Fixed top navigation shared by the landing + about pages. Transparent over
 * the hero, frosts once you scroll. "Work" / "Contact" smooth-scroll on the
 * landing page and route back to it from elsewhere; "About" is a real route.
 */
export function PortfolioNav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const goToSection = (id: string) => {
    setOpen(false);
    if (pathname === "/") {
      document
        .getElementById(id)
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    } else {
      navigate(`/#${id}`);
    }
  };

  return (
    <>
      <header className={`pf-nav${stuck ? " is-stuck" : ""}`}>
        <Link to="/" className="pf-brand" onClick={() => setOpen(false)} aria-label={`${designer.name} — home`}>
          <span className="pf-brand-mark" aria-hidden="true">
            橋
          </span>
          <span className="pf-brand-name">
            {designer.name}
            <small>{designer.role}</small>
          </span>
        </Link>

        <nav className="pf-nav-links" aria-label="Primary navigation">
          <button type="button" className="pf-nav-link" onClick={() => goToSection("work")}>
            Work
          </button>
          <Link to="/about" className="pf-nav-link">
            About
          </Link>
          <button type="button" className="pf-nav-link" onClick={() => goToSection("contact")}>
            Contact
          </button>
          <Link to="/login" className="pf-btn pf-nav-cta">
            Sign in
            <span className="pf-arrow" aria-hidden="true">
              →
            </span>
          </Link>
        </nav>

        <button
          type="button"
          className={`pf-nav-toggle${open ? " is-open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      <div className={`pf-menu${open ? " is-open" : ""}`} aria-hidden={!open}>
        <span className="pf-menu-ja">メニュー · Menu</span>
        <button type="button" onClick={() => goToSection("work")}>
          Work
        </button>
        <Link to="/about" onClick={() => setOpen(false)}>
          About
        </Link>
        <button type="button" onClick={() => goToSection("contact")}>
          Contact
        </button>
        <Link to="/login" onClick={() => setOpen(false)}>
          Sign in →
        </Link>
      </div>
    </>
  );
}
