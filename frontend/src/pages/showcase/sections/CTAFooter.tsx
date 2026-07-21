import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { brand } from "../showcase-data";

/** Pink-gradient closing CTA + footer. */
export default function CTAFooter({ onJump }: { onJump: (id: string) => void }) {
  const year = 2026;
  return (
    <footer className="relative z-10 px-4 pb-8 pt-10 sm:px-8">
      <section
        className="sk-reveal relative mx-auto max-w-6xl overflow-hidden rounded-[36px] px-6 py-16 text-center sm:px-12 sm:py-24"
        style={{ background: "linear-gradient(135deg, #ff5d94 0%, #ff86ac 42%, #ffc06a 108%)" }}
      >
        {/* glow + petals */}
        <div
          className="sk-glow pointer-events-none absolute -right-16 -top-16 h-72 w-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5), transparent 70%)" }}
          aria-hidden="true"
        />
        <img
          src="/cherry/petals/bloom-b.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute left-6 top-8 w-16 -rotate-12 opacity-70"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />
        <img
          src="/cherry/petals/bloom-a.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-8 right-10 w-20 rotate-12 opacity-70"
          onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
        />

        <div className="relative z-10">
          <span className="text-sm font-bold uppercase tracking-[0.24em] text-white/80">{brand.glyph} · {brand.tagline}</span>
          <h2 className="sk-display mx-auto mt-4 max-w-3xl text-4xl leading-[1.05] text-white sm:text-6xl">
            Start learning Japanese today.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-white/85">
            Free to begin. Bring your streak, your decks and your curiosity — the blossoms are waiting.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={brand.startHref}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-base font-bold text-[color:var(--sk-pink-deep)] shadow-[0_20px_50px_-18px_rgba(0,0,0,0.4)] transition-transform hover:-translate-y-0.5"
            >
              Create your free account
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to={brand.signInHref}
              className="inline-flex items-center gap-2 rounded-full border border-white/60 px-7 py-4 text-base font-semibold text-white transition-colors hover:bg-white/15"
            >
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* footer row */}
      <div className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-4 px-2 sm:flex-row">
        <div className="flex items-center gap-2">
          <img
            src="/hanabun-logo.svg"
            alt=""
            className="h-6 w-6"
            onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
          />
          <span className="sk-display text-base text-[color:var(--sk-ink)]">
            {brand.name} <span className="text-[color:var(--sk-pink)]">{brand.glyph}</span>
          </span>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-semibold text-[color:var(--sk-ink-soft)]">
          <button onClick={() => onJump("features")} className="transition-colors hover:text-[color:var(--sk-pink-deep)]">
            Features
          </button>
          <button onClick={() => onJump("preview")} className="transition-colors hover:text-[color:var(--sk-pink-deep)]">
            Preview
          </button>
          <button onClick={() => onJump("roles")} className="transition-colors hover:text-[color:var(--sk-pink-deep)]">
            For you
          </button>
          <Link to={brand.signInHref} className="transition-colors hover:text-[color:var(--sk-pink-deep)]">
            Sign in
          </Link>
        </nav>
        <span className="text-xs text-[color:var(--sk-ink-soft)]">
          © {year} {brand.name} · showcase page
        </span>
      </div>
    </footer>
  );
}
