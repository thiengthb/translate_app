import { useEffect, useState, type CSSProperties } from "react";
import { Check, Flame, Medal, Sparkles } from "lucide-react";
import { dash } from "../showcase-data";
import { useInViewOnce } from "../useScrollReveal";

const PINK = "#ff6b9d";
const MINT = "#3fb99a";
const HONEY = "#e2a53a";

/** Ease-out count-up; snaps to target under reduced motion. */
function useCountUp(target: number, active: boolean, reduced: boolean, dur = 1100) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (reduced) {
      setV(target);
      return;
    }
    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / dur, 1);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [active, target, dur, reduced]);
  return v;
}

export default function LivePreview({ reduced }: { reduced: boolean }) {
  const [ref, rawInView] = useInViewOnce<HTMLDivElement>(reduced);
  const live = rawInView || reduced;

  const streak = useCountUp(dash.streak.current, live, reduced);
  const longest = useCountUp(dash.streak.longest, live, reduced);
  const total = useCountUp(dash.streak.total, live, reduced);

  return (
    <section id="preview" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-8">
      <div className="sk-reveal mb-12 max-w-2xl">
        <span className="text-sm font-bold uppercase tracking-[0.22em] text-[color:var(--sk-pink-deep)]">
          Your daily dashboard
        </span>
        <h2 className="sk-display mt-3 text-4xl leading-[1.05] text-[color:var(--sk-ink)] sm:text-5xl">
          Progress that <span className="sk-grad">blooms</span> as you show up.
        </h2>
        <p className="mt-4 text-lg text-[color:var(--sk-ink-soft)]">
          Streaks, EXP and missions turn everyday study into a habit. Here’s the real thing, in motion.
        </p>
      </div>

      {/* mock app window */}
      <div ref={ref} className="sk-reveal sk-glass overflow-hidden rounded-[30px] p-3 sm:p-5">
        <div className="mb-4 flex items-center gap-2 px-2">
          <span className="h-3 w-3 rounded-full" style={{ background: PINK }} />
          <span className="h-3 w-3 rounded-full" style={{ background: HONEY }} />
          <span className="h-3 w-3 rounded-full" style={{ background: MINT }} />
          <span className="ml-3 text-xs font-semibold text-[color:var(--sk-ink-soft)]">hanabun · dashboard</span>
          <span className="ml-auto hidden items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[color:var(--sk-pink-deep)] sm:inline-flex">
            <Sparkles className="h-3.5 w-3.5" /> Ngày học thứ {dash.studyDay}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {/* Streak + calendar */}
          <div className="rounded-3xl bg-white/70 p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5" style={{ color: PINK }} />
              <span className="sk-display text-lg text-[color:var(--sk-ink)]">Lịch học tập</span>
              <span className="ml-auto rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: PINK }}>
                ✓ hôm nay
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                { icon: "🔥", v: streak, label: "Chuỗi hiện tại" },
                { icon: "🏆", v: longest, label: "Chuỗi dài nhất" },
                { icon: "📅", v: total, label: "Tổng ngày học" },
              ].map((t) => (
                <div key={t.label} className="rounded-2xl bg-[color:var(--sk-pink-wash)] px-3 py-3 text-center">
                  <div className="text-lg">{t.icon}</div>
                  <div className="sk-display text-2xl leading-tight text-[color:var(--sk-pink-deep)]">{t.v}</div>
                  <div className="text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">{t.label}</div>
                </div>
              ))}
            </div>

            {/* month grid */}
            <div className="mt-4 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => {
                const studied = i % 9 !== 4 && i % 7 !== 6 && i < 30;
                const today = i === 29;
                return (
                  <span
                    key={i}
                    className="grid aspect-square place-items-center rounded-lg text-[10px] font-bold"
                    style={{
                      background: studied ? "color-mix(in srgb, #ff6b9d 20%, white)" : "rgba(255,255,255,0.7)",
                      color: studied ? PINK : "#c9b8bf",
                      boxShadow: today ? `0 0 0 2px ${PINK}` : undefined,
                      opacity: live ? 1 : 0,
                      transform: live ? "scale(1)" : "scale(0.4)",
                      transition: `opacity .4s ease ${0.2 + i * 0.012}s, transform .4s cubic-bezier(.16,1,.3,1) ${0.2 + i * 0.012}s`,
                    }}
                  >
                    {studied ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
                  </span>
                );
              })}
            </div>
          </div>

          {/* right column */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-white/70 p-5">
              <div className="flex items-baseline justify-between">
                <span className="sk-display text-lg text-[color:var(--sk-ink)]">Thành tích</span>
                <span className="text-xs font-semibold text-[color:var(--sk-ink-soft)]">EXP · tuần này</span>
              </div>
              <ExpChart live={live} />
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-2">
              <div className="rounded-3xl bg-white/70 p-4 text-center">
                <Donut live={live} />
                <div className="mt-1 text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">
                  {dash.weekly.done}/{dash.weekly.of} ngày tuần này
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white/70 p-4 text-center">
                <Medal className="h-6 w-6" style={{ color: HONEY }} />
                <div className="sk-display mt-1 text-3xl text-[color:var(--sk-ink)]">#{dash.rank}</div>
                <div className="text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">Xếp hạng</div>
              </div>
            </div>
          </div>
        </div>

        {/* missions */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {dash.missions.map((m, i) => (
            <div key={m.key} className="rounded-3xl bg-white/70 p-4">
              <div className="flex items-center justify-between">
                <span className="sk-display text-sm tracking-wide text-[color:var(--sk-ink)]">{m.label}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    background: i === 0 ? "color-mix(in srgb, #3fb99a 18%, white)" : "color-mix(in srgb, #ff6b9d 16%, white)",
                    color: i === 0 ? MINT : PINK,
                  }}
                >
                  {m.status}
                </span>
              </div>
              <div className="mt-1 text-[11px] font-semibold text-[color:var(--sk-ink-soft)]">{m.note}</div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[color:var(--sk-pink-wash)]">
                <div
                  className="h-full rounded-full"
                  style={{
                    background: i === 0 ? MINT : i === 2 ? HONEY : PINK,
                    width: live ? `${(m.done / m.of) * 100}%` : "0%",
                    transition: `width 1s cubic-bezier(.16,1,.3,1) ${0.3 + i * 0.12}s`,
                  }}
                />
              </div>
              <div className="mt-1.5 text-right text-[11px] font-bold text-[color:var(--sk-ink-soft)]">
                {m.done}/{m.of}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---- EXP sparkline (draws in via stroke-dashoffset) ------------------ */
function ExpChart({ live }: { live: boolean }) {
  const W = 280;
  const H = 96;
  const pad = 10;
  const vals: number[] = [...dash.exp.values];
  const max = Math.max(...vals);
  const pts = vals.map((v, i) => {
    const x = pad + (i * (W - 2 * pad)) / (vals.length - 1);
    const y = H - pad - (v / max) * (H - 2 * pad);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${H - pad} L ${pts[0][0].toFixed(1)} ${H - pad} Z`;
  const peakIdx = vals.indexOf(max);
  const peak = pts[peakIdx];
  const DASH = 420;

  return (
    <div className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly EXP chart">
        <defs>
          <linearGradient id="sk-exp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity="0.35" />
            <stop offset="100%" stopColor={PINK} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sk-exp-fill)" style={{ opacity: live ? 1 : 0, transition: "opacity .8s ease .6s" }} />
        <path
          d={line}
          fill="none"
          stroke={PINK}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: DASH,
            strokeDashoffset: live ? 0 : DASH,
            transition: "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1)",
          }}
        />
        <circle
          cx={peak[0]}
          cy={peak[1]}
          r={4}
          fill="#fff"
          stroke={PINK}
          strokeWidth={2.5}
          style={{
            transformOrigin: `${peak[0]}px ${peak[1]}px`,
            transform: live ? "scale(1)" : "scale(0)",
            transition: "transform .5s cubic-bezier(.16,1,.3,1) 1.3s",
          }}
        />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[9px] font-semibold text-[color:var(--sk-ink-soft)]">
        {dash.exp.labels.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
      <div
        className="absolute -top-1 rounded-md px-2 py-0.5 text-[10px] font-bold text-white"
        style={{ left: `${(peak[0] / W) * 100}%`, transform: "translateX(-50%)", background: PINK }}
      >
        {dash.exp.peakLabel}
      </div>
    </div>
  );
}

/* ---- weekly-consistency donut --------------------------------------- */
function Donut({ live }: { live: boolean }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = dash.weekly.done / dash.weekly.of;
  const label = Math.round(pct * 100);
  return (
    <div className="relative mx-auto grid h-24 w-24 place-items-center">
      <svg viewBox="0 0 84 84" className="-rotate-90">
        <circle cx="42" cy="42" r={r} fill="none" stroke="var(--sk-pink-wash)" strokeWidth="9" />
        <circle
          cx="42"
          cy="42"
          r={r}
          fill="none"
          stroke={PINK}
          strokeWidth="9"
          strokeLinecap="round"
          style={
            {
              strokeDasharray: c,
              strokeDashoffset: live ? c * (1 - pct) : c,
              transition: "stroke-dashoffset 1.4s cubic-bezier(.16,1,.3,1) .3s",
            } as CSSProperties
          }
        />
      </svg>
      <div className="sk-display absolute text-xl text-[color:var(--sk-ink)]">{label}%</div>
    </div>
  );
}
