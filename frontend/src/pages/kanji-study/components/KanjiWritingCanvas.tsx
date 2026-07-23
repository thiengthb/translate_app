import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { HelpCircle, Info, RotateCcw, SkipForward, Star } from "lucide-react";
import { parseKvg } from "./kanjiVg";
import { matchStroke, samplePath, type Leniency, type Pt } from "../lib/strokeMatch";

/**
 * The handwriting surface for "Luyện viết". The learner draws the kanji one
 * stroke at a time; each finished stroke is matched against the expected
 * KanjiVG stroke ({@link matchStroke}). A correct stroke snaps to the clean
 * model path ("chỉnh nét"); a wrong one is rejected and, after a few misses
 * (when "Hiện gợi ý" is on), the correct stroke is flashed as a guide.
 *
 * Strokes load from the imported `strokeData` first, falling back to the
 * KanjiVG CDN by character — same strategy as {@link KanjiStrokeAnimator}.
 *
 * Reset between kanji (and on "Làm lại đến khi hoàn hảo" retries) is done by
 * the parent remounting this component with a fresh `key`.
 */

const HINT_AFTER = 3; // misses on one stroke before auto-revealing it
const toHex5 = (ch: string) => ch.codePointAt(0)!.toString(16).padStart(5, "0");

export interface WritingOutcome {
  passed: boolean; // completed with no mistakes and no hints
  skipped: boolean;
  mistakes: number;
  hints: number;
  strokes: number;
  accuracy: number; // 0…1
}

interface Props {
  character: string;
  strokeData?: string | null;
  viewBox?: string | null;
  leniency: Leniency;
  showHint: boolean;
  showAnswer: boolean;
  hypermode: boolean;
  starred?: boolean;
  onStroke?: (kind: "correct" | "wrong" | "hint") => void;
  onProgress?: (done: number, total: number) => void;
  onComplete: (outcome: WritingOutcome) => void;
  onInfo?: () => void;
  onToggleStar?: () => void;
}

export function KanjiWritingCanvas({
  character,
  strokeData,
  viewBox,
  leniency,
  showHint,
  showAnswer,
  hypermode,
  starred,
  onStroke,
  onProgress,
  onComplete,
  onInfo,
  onToggleStar,
}: Props) {
  const [strokes, setStrokes] = useState<string[]>([]);
  const [vb, setVb] = useState(viewBox || "0 0 109 109");
  const [phase, setPhase] = useState<"loading" | "ok" | "error">("loading");

  const [current, setCurrent] = useState(0); // index of the next stroke to draw
  const [userPath, setUserPath] = useState<Pt[]>([]);
  const [hintFor, setHintFor] = useState<number | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const userPathRef = useRef<Pt[]>([]);
  const modelPolys = useRef<Pt[][]>([]);
  const strokeMisses = useRef(0); // misses on the CURRENT stroke
  const totals = useRef({ mistakes: 0, hints: 0, score: 0 });
  const drawing = useRef(false);
  const completed = useRef(false);

  // Keep callbacks in refs so progress/complete effects don't re-fire on every
  // parent render.
  const cb = useRef({ onStroke, onProgress, onComplete });
  cb.current = { onStroke, onProgress, onComplete };

  const [vbMinX, vbMinY, vbW, vbH] = useMemo(() => {
    const p = vb.split(/\s+/).map(Number);
    return p.length === 4 && p.every((n) => isFinite(n)) ? p : [0, 0, 109, 109];
  }, [vb]);

  /* ── load strokes: imported data first, else KanjiVG CDN ─────────────── */
  useEffect(() => {
    let cancelled = false;
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
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error("not found"))))
      .then((xml) => {
        if (cancelled) return;
        const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
        const paths = Array.from(doc.querySelectorAll("path"))
          .filter((p) => /-s\d+$/.test(p.getAttribute("id") ?? ""))
          .map((p) => p.getAttribute("d") || "")
          .filter(Boolean);
        setVb(doc.querySelector("svg")?.getAttribute("viewBox") || "0 0 109 109");
        setStrokes(paths);
        setPhase(paths.length ? "ok" : "error");
      })
      .catch(() => !cancelled && setPhase("error"));
    return () => {
      cancelled = true;
    };
  }, [character, strokeData]);

  // Sample model polylines (matching space) once the strokes are known.
  useLayoutEffect(() => {
    modelPolys.current = strokes.map((d) => samplePath(d, 16));
  }, [strokes]);

  // Report remaining-stroke progress to the parent header ("X nét").
  useEffect(() => {
    cb.current.onProgress?.(current, strokes.length);
  }, [current, strokes.length]);

  // Fire completion exactly once when every stroke is done.
  useEffect(() => {
    if (phase !== "ok" || strokes.length === 0 || completed.current) return;
    if (current >= strokes.length) {
      completed.current = true;
      const { mistakes, hints, score } = totals.current;
      cb.current.onComplete({
        passed: mistakes === 0 && hints === 0,
        skipped: false,
        mistakes,
        hints,
        strokes: strokes.length,
        accuracy: strokes.length ? score / strokes.length : 0,
      });
    }
  }, [current, phase, strokes.length]);

  /* ── pointer drawing ─────────────────────────────────────────────────── */

  const toViewBox = (e: React.PointerEvent): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: vbMinX + ((e.clientX - rect.left) / rect.width) * vbW,
      y: vbMinY + ((e.clientY - rect.top) / rect.height) * vbH,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== "ok" || current >= strokes.length) return;
    drawing.current = true;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = [toViewBox(e)];
    userPathRef.current = p;
    setUserPath(p);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const p = [...userPathRef.current, toViewBox(e)];
    userPathRef.current = p;
    setUserPath(p);
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const path = userPathRef.current;
    userPathRef.current = [];
    setUserPath([]);
    finishStroke(path);
  };

  const finishStroke = (path: Pt[]) => {
    if (path.length < 2 || current >= strokes.length) return;
    const model = modelPolys.current[current] ?? [];
    const res = matchStroke(path, model, leniency);

    if (res.ok) {
      totals.current.score += res.score;
      strokeMisses.current = 0;
      setHintFor(null);
      cb.current.onStroke?.("correct");
      setCurrent((c) => c + 1);
    } else {
      strokeMisses.current += 1;
      totals.current.mistakes += 1;
      cb.current.onStroke?.("wrong");
      if (showHint && strokeMisses.current >= HINT_AFTER) setHintFor(current);
    }
  };

  /* ── controls ────────────────────────────────────────────────────────── */

  const undo = () => {
    if (current === 0) return;
    strokeMisses.current = 0;
    setHintFor(null);
    setCurrent((c) => Math.max(0, c - 1));
  };

  const requestHint = () => {
    if (current >= strokes.length) return;
    totals.current.hints += 1;
    setHintFor(current);
    cb.current.onStroke?.("hint");
  };

  const skip = () => {
    if (completed.current) return;
    completed.current = true;
    const { mistakes, hints } = totals.current;
    cb.current.onStroke?.("hint");
    onComplete({ passed: false, skipped: true, mistakes, hints, strokes: strokes.length, accuracy: 0 });
  };

  /* ── render ──────────────────────────────────────────────────────────── */

  if (phase === "loading")
    return (
      <CanvasFrame>
        <div className="absolute inset-0 grid place-items-center">
          <div className="h-7 w-7 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
        </div>
      </CanvasFrame>
    );

  if (phase === "error")
    return (
      <CanvasFrame>
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Không có dữ liệu thứ tự nét cho Hán tự này — chưa thể luyện viết.
          </p>
        </div>
        <CornerButton position="br" label="Bỏ qua" onClick={skip}>
          <SkipForward size={18} />
        </CornerButton>
      </CanvasFrame>
    );

  const userD =
    userPath.length > 1
      ? "M" + userPath.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" L")
      : "";
  const showGuide = showAnswer && !hypermode;

  return (
    <CanvasFrame>
      <svg
        ref={svgRef}
        viewBox={vb}
        className="absolute inset-0 h-full w-full touch-none select-none text-gray-900 dark:text-gray-100"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* genkō-yōshi guide lines */}
        <line x1={vbMinX + vbW / 2} y1={vbMinY} x2={vbMinX + vbW / 2} y2={vbMinY + vbH}
          stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="4,3" />
        <line x1={vbMinX} y1={vbMinY + vbH / 2} x2={vbMinX + vbW} y2={vbMinY + vbH / 2}
          stroke="currentColor" strokeOpacity={0.12} strokeWidth={0.5} strokeDasharray="4,3" />

        {/* faint outline of remaining strokes (Xem đáp án) */}
        {showGuide &&
          strokes.map((d, i) =>
            i >= current ? (
              <path key={`g${i}`} d={d} fill="none" stroke="currentColor" strokeOpacity={0.14}
                strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            ) : null
          )}

        {/* accepted strokes (snapped to the clean model path) */}
        {strokes.map((d, i) =>
          i < current ? (
            <path key={`a${i}`} d={d} fill="none" stroke="currentColor" strokeWidth={4.5}
              strokeLinecap="round" strokeLinejoin="round"
              style={{ filter: "drop-shadow(0 0 1.5px rgba(244,63,94,0.55))" }} />
          ) : null
        )}

        {/* hint: flash the current correct stroke */}
        {hintFor != null && hintFor < strokes.length && (
          <path d={strokes[hintFor]} fill="none" stroke="#f43f5e" strokeOpacity={0.9}
            strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray="6,4" className="animate-pulse" />
        )}

        {/* the stroke being drawn */}
        {userD && (
          <path d={userD} fill="none" stroke="#f43f5e" strokeWidth={5}
            strokeLinecap="round" strokeLinejoin="round" />
        )}
      </svg>

      {/* corner controls (mirror the mobile app) */}
      <CornerButton position="tl" label="Hoàn tác nét" onClick={undo} disabled={current === 0}>
        <RotateCcw size={18} />
      </CornerButton>
      <CornerButton position="tr" label="Gợi ý nét" onClick={requestHint}>
        {showGuide ? <Star size={18} className="fill-current" /> : <HelpCircle size={18} />}
      </CornerButton>
      <CornerButton position="bl" label="Thông tin Hán tự" onClick={onInfo} hidden={!onInfo}>
        <Info size={18} />
      </CornerButton>
      {onToggleStar ? (
        <CornerButton position="br" label="Đánh dấu" onClick={onToggleStar}>
          <Star size={18} className={starred ? "fill-rose-500 text-rose-500" : ""} />
        </CornerButton>
      ) : (
        <CornerButton position="br" label="Bỏ qua chữ này" onClick={skip}>
          <SkipForward size={18} />
        </CornerButton>
      )}
    </CanvasFrame>
  );
}

/* ── presentational helpers ─────────────────────────────────────────────── */

function CanvasFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px] rounded-2xl border border-border bg-muted/40 dark:bg-gray-950/60 overflow-hidden">
      {children}
    </div>
  );
}

function CornerButton({
  position,
  label,
  onClick,
  disabled,
  hidden,
  children,
}: {
  position: "tl" | "tr" | "bl" | "br";
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  hidden?: boolean;
  children: React.ReactNode;
}) {
  if (hidden) return null;
  const pos = {
    tl: "top-2 left-2",
    tr: "top-2 right-2",
    bl: "bottom-2 left-2",
    br: "bottom-2 right-2",
  }[position];
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`absolute ${pos} z-10 grid h-9 w-9 place-items-center rounded-full bg-card/80 text-muted-foreground backdrop-blur-sm hover:text-foreground hover:bg-card disabled:opacity-25 disabled:cursor-not-allowed transition-colors`}
    >
      {children}
    </button>
  );
}
