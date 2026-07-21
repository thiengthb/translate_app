import { Link } from "react-router-dom";
import { brand } from "../showcase-data";

/** Fixed glass top bar. Anchor links scroll; CTAs route into the app. */
export default function Nav({ onJump }: { onJump: (id: string) => void }) {
  const links: { label: string; id: string }[] = [
    { label: "Features", id: "features" },
    { label: "Preview", id: "preview" },
    { label: "For you", id: "roles" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 sm:px-8">
      <div className="sk-glass flex items-center gap-2.5 rounded-full py-2 pl-2.5 pr-4">
        <img
          src="/hanabun-logo.svg"
          alt=""
          className="h-7 w-7"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="sk-display text-lg leading-none text-[color:var(--sk-ink)]">
          {brand.name}
          <span className="ml-1 align-middle text-[color:var(--sk-pink)]">{brand.glyph}</span>
        </span>
      </div>

      <nav className="sk-glass hidden items-center gap-1 rounded-full px-2 py-1.5 md:flex">
        {links.map((l) => (
          <button
            key={l.id}
            onClick={() => onJump(l.id)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-[color:var(--sk-ink-soft)] transition-colors hover:bg-[color:var(--sk-pink-wash)] hover:text-[color:var(--sk-pink-deep)]"
          >
            {l.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <Link
          to={brand.signInHref}
          className="hidden rounded-full px-4 py-2 text-sm font-semibold text-[color:var(--sk-ink-soft)] transition-colors hover:text-[color:var(--sk-pink-deep)] sm:inline-flex"
        >
          Sign in
        </Link>
        <Link
          to={brand.startHref}
          className="rounded-full bg-[color:var(--sk-pink)] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_-10px_rgba(233,79,131,0.8)] transition-transform hover:-translate-y-0.5"
        >
          Start learning
        </Link>
      </div>
    </header>
  );
}
