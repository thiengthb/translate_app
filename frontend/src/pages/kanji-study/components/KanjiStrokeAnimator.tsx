import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { parseKvg } from "./kanjiVg";

/**
 * Animated KanjiVG stroke-order player for the Kanji-study detail page.
 *
 * Prefers the imported `strokeData` (KanjiVG payload stored on the kanji
 * record); if that's missing it falls back to fetching the SVG straight from
 * the KanjiVG CDN by character, so the player still works for un-imported
 * kanji. Stroke paths are drawn one-by-one with a dash-offset animation.
 */

const SPEEDS = [
  { label: "Chậm", ms: 1200 },
  { label: "Vừa", ms: 700 },
  { label: "Nhanh", ms: 280 },
];

const toHex5 = (ch: string) => ch.codePointAt(0)!.toString(16).padStart(5, "0");

function StrokePath({
  d,
  state,
  ms,
}: {
  d: string;
  state: "hidden" | "animating" | "shown";
  ms: number;
}) {
  const ref = useRef<SVGPathElement>(null);
  const [len, setLen] = useState<number | null>(null);

  useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength());
  }, [d]);

  return (
    <path
      ref={ref}
      d={d}
      fill="none"
      stroke={state === "animating" ? "#f43f5e" : "currentColor"}
      strokeWidth={3.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={
        len != null
          ? {
              strokeDasharray: len,
              strokeDashoffset: state === "hidden" ? len : 0,
              transition:
                state === "animating"
                  ? `stroke-dashoffset ${ms}ms ease-in-out`
                  : "stroke 400ms ease",
            }
          : { opacity: 0 }
      }
    />
  );
}

export function KanjiStrokeAnimator({
  character,
  strokeData,
  viewBox,
}: {
  character: string;
  strokeData?: string | null;
  viewBox?: string | null;
}) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [vb, setVb] = useState(viewBox || "0 0 109 109");
  const [phase, setPhase] = useState<"loading" | "ok" | "error">("loading");
  const [drawn, setDrawn] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fixed animation speed — "Nhanh" (fast); the speed selector UI is hidden.
  const ms = SPEEDS[2].ms;

  // Load strokes: imported data first, else CDN fallback.
  useEffect(() => {
    let cancelled = false;
    setDrawn(0);
    setPlaying(false);

    const local = parseKvg(strokeData);
    if (local) {
      setStrokes(local.strokes);
      setVb(local.v);
      setPhase("ok");
      return;
    }

    if (!character) {
      setPhase("error");
      return;
    }
    setPhase("loading");
    fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${toHex5(character)}.svg`)
      .then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.text();
      })
      .then((xml) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
        const paths = Array.from(doc.querySelectorAll("path"))
          .filter((p) => /-s\d+$/.test(p.getAttribute("id") ?? ""))
          .map((p) => p.getAttribute("d") || "")
          .filter(Boolean);
        const vbAttr = doc.querySelector("svg")?.getAttribute("viewBox") || "0 0 109 109";
        setStrokes(paths);
        setVb(vbAttr);
        setPhase(paths.length ? "ok" : "error");
      })
      .catch(() => !cancelled && setPhase("error"));

    return () => {
      cancelled = true;
    };
  }, [character, strokeData]);

  // Auto-play from the first stroke whenever a new kanji's strokes are ready.
  useEffect(() => {
    if (phase === "ok" && strokes.length) {
      setDrawn(0);
      setPlaying(true);
    }
  }, [phase, strokes]);

  // Auto-advance while playing.
  useEffect(() => {
    if (!playing) return;
    if (drawn >= strokes.length) {
      setPlaying(false);
      return;
    }
    timer.current = setTimeout(() => setDrawn((d) => d + 1), ms + 120);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [playing, drawn, strokes.length, ms]);

  // Clicking inside the canvas restarts the animation from the first stroke.
  const replay = useCallback(() => {
    setDrawn(0);
    setPlaying(true);
  }, []);
  const prev = () => {
    setPlaying(false);
    setDrawn((d) => Math.max(d - 1, 0));
  };
  const next = () => {
    setPlaying(false);
    setDrawn((d) => Math.min(d + 1, strokes.length));
  };

  if (phase === "loading")
    return (
      <div className="flex justify-center py-10">
        <div className="h-6 w-6 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
      </div>
    );

  if (phase === "error")
    return (
      <p className="text-center text-xs text-muted-foreground py-6">
        Không có dữ liệu thứ tự nét cho Hán tự này.
      </p>
    );

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative cursor-pointer"
        onClick={replay}
        title="Bấm để xem lại"
      >
        <svg
          viewBox={vb}
          width={200}
          height={200}
          className="rounded-2xl border border-border bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
        >
          <rect x={2} y={2} width={105} height={105} rx={3} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} />
          <line x1={54.5} y1={3} x2={54.5} y2={106} stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="4,3" />
          <line x1={3} y1={54.5} x2={106} y2={54.5} stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="4,3" />
          {strokes.map((d, i) => (
            <StrokePath
              key={i}
              d={d}
              ms={ms}
              state={i < drawn - 1 ? "shown" : i === drawn - 1 ? "animating" : "hidden"}
            />
          ))}
        </svg>
        <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 tabular-nums backdrop-blur-sm select-none">
          {drawn}/{strokes.length}
        </span>
      </div>

      <div className="flex gap-1.5 flex-wrap justify-center" style={{ maxWidth: 220 }}>
        {strokes.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setPlaying(false);
              setDrawn(i + 1);
            }}
            title={`Nét ${i + 1}`}
            className={`h-2 w-2 rounded-full transition-all duration-200 ${
              i < drawn ? "bg-rose-500 scale-110" : "bg-muted hover:bg-muted-foreground/40"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={prev}
          disabled={drawn === 0}
          title="Nét trước"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={next}
          disabled={drawn >= strokes.length}
          title="Nét sau"
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
