import { useRef, type CSSProperties, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  BookOpen,
  Bookmark,
  ClipboardList,
  Gamepad2,
  Globe,
  GraduationCap,
  Layers,
  Library,
  PenLine,
  PenTool,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { brand, features, type Tone } from "../showcase-data";

const ICONS: Record<string, LucideIcon> = {
  PenLine,
  Layers,
  BookOpen,
  GraduationCap,
  ClipboardList,
  Gamepad2,
  PenTool,
  Globe,
  Library,
  Bookmark,
  Users,
  Trophy,
};

const TONE: Record<Tone, string> = {
  pink: "#ff6b9d",
  rose: "#ff8fab",
  mint: "#3fb99a",
  honey: "#e2a53a",
  plum: "#a4638a",
};

const SPAN: Record<2 | 3, string> = { 2: "lg:col-span-2", 3: "lg:col-span-3" };

/** Vanilla pointer-tilt card (no dependency on Framer's runtime). */
function TiltCard({ tone, reduced, children }: { tone: string; reduced: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);

  const onMove = (e: React.PointerEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 10).toFixed(2)}deg) translateY(-4px)`;
  };
  const reset = () => {
    const el = ref.current;
    if (el) el.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={reset}
      className="group sk-glass relative flex h-full flex-col overflow-hidden rounded-[26px] p-6 transition-[transform,border-color,box-shadow] duration-300 will-change-transform"
      style={{ "--tone": tone } as CSSProperties}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(120% 90% at 100% 0%, color-mix(in srgb, ${tone} 24%, transparent), transparent 62%)` }}
        aria-hidden="true"
      />
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: tone }}
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full flex-col">{children}</div>
    </div>
  );
}

export default function Features({ reduced }: { reduced: boolean }) {
  return (
    <section id="features" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
      <div className="sk-reveal mb-12 max-w-2xl">
        <span className="text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--sk-pink-deep)]">
          Everything to learn Japanese
        </span>
        <h2 className="sk-display mt-3 text-4xl leading-[1.05] text-[color:var(--sk-ink)] sm:text-5xl">
          One garden, <span className="sk-grad">a dozen ways</span> to grow.
        </h2>
        <p className="mt-4 text-lg text-[color:var(--sk-ink-soft)]">
          From spaced-repetition kanji to AI writing feedback and classroom tools — every feature is built to keep
          you coming back tomorrow.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {features.map((f, i) => {
          const Icon = ICONS[f.icon] ?? Layers;
          const tone = TONE[f.tone];
          return (
            <div
              key={f.title}
              className={`sk-reveal ${SPAN[f.span]}`}
              style={{ transitionDelay: `${(i % 6) * 0.05}s` } as CSSProperties}
            >
              <Link to={brand.startHref} className="block h-full">
                <TiltCard tone={tone} reduced={reduced}>
                  <div className="mb-5 flex items-start justify-between">
                    <span
                      className="grid h-12 w-12 place-items-center rounded-2xl"
                      style={{ background: `color-mix(in srgb, ${tone} 16%, white)`, color: tone }}
                    >
                      <Icon className="h-6 w-6" strokeWidth={2.2} />
                    </span>
                    {f.tag && (
                      <span
                        className="rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider"
                        style={{ background: `color-mix(in srgb, ${tone} 14%, white)`, color: tone }}
                      >
                        {f.tag}
                      </span>
                    )}
                  </div>

                  <h3 className="sk-display flex items-baseline gap-2 text-2xl text-[color:var(--sk-ink)]">
                    {f.title}
                    <span className="text-base font-normal text-[color:var(--sk-ink-soft)]">{f.ja}</span>
                  </h3>

                  <p className="mt-2 text-[15px] leading-relaxed text-[color:var(--sk-ink-soft)]">{f.blurb}</p>

                  <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-bold" style={{ color: tone }}>
                    Explore
                    <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </TiltCard>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
