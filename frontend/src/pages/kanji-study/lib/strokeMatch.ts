/**
 * Stroke-recognition engine for "Luyện viết" (the writing study mode).
 *
 * The kanji's correct strokes come from KanjiVG path `d` strings (the same
 * `strokeData` the detail page animates — see {@link ../components/kanjiVg}).
 * We sample each model stroke into an evenly-spaced polyline, capture the
 * user's drawn stroke as a polyline (already converted to the SAME 0…109
 * viewBox space by the canvas), then compare them by:
 *
 *   - **position**   — both polylines live in absolute viewBox coords, so a
 *     stroke drawn in the wrong place simply won't line up (position matters
 *     a lot in kanji: 上 vs 下 differ only by where strokes sit);
 *   - **shape**      — mean per-point distance after arc-length resampling;
 *   - **direction**  — a stroke drawn end-to-start (reversed) is wrong;
 *   - **length**     — guards against tiny dashes / giant scribbles.
 *
 * "Chỉnh nét" in the mobile app = how lenient this matcher is; that maps to
 * the {@link Leniency} thresholds below. Everything is client-side — the
 * backend only stores the outcome (see KanjiWritingAttempt).
 */

export interface Pt {
  x: number;
  y: number;
}

/* ── path sampling (needs the DOM for getPointAtLength) ──────────────────── */

// A single hidden <path> kept off-screen; SVG geometry APIs only work on an
// element that is in the document, but it needs no size and is never painted.
let measurePath: SVGPathElement | null = null;

function ensureMeasurePath(): SVGPathElement | null {
  if (typeof document === "undefined") return null;
  if (!measurePath) {
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "0");
    svg.setAttribute("height", "0");
    svg.setAttribute("aria-hidden", "true");
    svg.style.cssText = "position:absolute;left:-9999px;top:-9999px;width:0;height:0;";
    measurePath = document.createElementNS(NS, "path");
    svg.appendChild(measurePath);
    document.body.appendChild(svg);
  }
  return measurePath;
}

/** Evenly sample `n` points along an SVG path `d` (in its own coord space). */
export function samplePath(d: string, n = 16): Pt[] {
  const p = ensureMeasurePath();
  if (!p) return [];
  p.setAttribute("d", d);
  let len = 0;
  try {
    len = p.getTotalLength();
  } catch {
    return [];
  }
  if (!len || !isFinite(len)) {
    try {
      const pt = p.getPointAtLength(0);
      return [{ x: pt.x, y: pt.y }];
    } catch {
      return [];
    }
  }
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const pt = p.getPointAtLength((len * i) / (n - 1));
    out.push({ x: pt.x, y: pt.y });
  }
  return out;
}

/* ── polyline helpers ────────────────────────────────────────────────────── */

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export function polyLength(pts: Pt[]): number {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += dist(pts[i], pts[i - 1]);
  return s;
}

/** Resample a polyline to exactly `n` arc-length-even points. */
export function resample(pts: Pt[], n = 16): Pt[] {
  if (pts.length === 0) return [];
  if (pts.length === 1) return Array.from({ length: n }, () => ({ ...pts[0] }));
  const total = polyLength(pts);
  if (total === 0) return Array.from({ length: n }, () => ({ ...pts[0] }));

  const step = total / (n - 1);
  const out: Pt[] = [{ ...pts[0] }];
  let prev = pts[0];
  let acc = 0;
  let i = 1;
  while (out.length < n - 1 && i < pts.length) {
    const seg = dist(pts[i], prev);
    if (acc + seg >= step && seg > 0) {
      const t = (step - acc) / seg;
      const np = { x: prev.x + t * (pts[i].x - prev.x), y: prev.y + t * (pts[i].y - prev.y) };
      out.push(np);
      prev = np;
      acc = 0;
    } else {
      acc += seg;
      prev = pts[i];
      i++;
    }
  }
  while (out.length < n) out.push({ ...pts[pts.length - 1] });
  return out;
}

/* ── matching ────────────────────────────────────────────────────────────── */

export type Leniency = "LOW" | "MEDIUM" | "HIGH";

// Thresholds are in viewBox units (KanjiVG is 109×109). `avg` = max mean
// per-point distance, `ends` = max start/end distance, `lo`/`hi` = allowed
// drawn-to-model length ratio. Higher leniency ("Chỉnh nét" cao) = bigger
// tolerances = more forgiving / more snapping.
const THRESHOLDS: Record<Leniency, { avg: number; ends: number; lo: number; hi: number }> = {
  LOW: { avg: 11, ends: 16, lo: 0.5, hi: 2.0 },
  MEDIUM: { avg: 16, ends: 23, lo: 0.42, hi: 2.4 },
  HIGH: { avg: 23, ends: 33, lo: 0.32, hi: 3.2 },
};

export interface MatchResult {
  ok: boolean;
  /** 0…1 closeness, used for the saved accuracy score. */
  score: number;
  reversed: boolean;
  reason?: "no-model" | "reversed" | "length" | "ends" | "shape" | "dot-pos";
}

const N = 16;

/**
 * Compare a drawn stroke against one model stroke. Both must already be in the
 * same viewBox coordinate space.
 */
export function matchStroke(drawnRaw: Pt[], modelRaw: Pt[], level: Leniency): MatchResult {
  const th = THRESHOLDS[level];
  if (modelRaw.length === 0) return { ok: false, score: 0, reversed: false, reason: "no-model" };

  const model = resample(modelRaw, N);
  const modelLen = polyLength(model);

  // Dots / hooks (e.g. the tick in 主, small 点): too short to have a
  // meaningful direction — accept on position alone.
  if (modelLen < 8) {
    const center = model[Math.floor(N / 2)];
    const near =
      drawnRaw.reduce((a, p) => a + dist(p, center), 0) / Math.max(drawnRaw.length, 1);
    const ok = near <= th.ends;
    return { ok, score: Math.max(0, 1 - near / th.ends), reversed: false, reason: ok ? undefined : "dot-pos" };
  }

  const drawn = resample(drawnRaw, N);
  let fwd = 0;
  let rev = 0;
  for (let i = 0; i < N; i++) {
    fwd += dist(drawn[i], model[i]);
    rev += dist(drawn[i], model[N - 1 - i]);
  }
  fwd /= N;
  rev /= N;
  const reversed = rev < fwd;
  const mean = Math.min(fwd, rev);
  const score = Math.max(0, 1 - mean / (th.avg * 1.6));

  const ratio = polyLength(drawn) / modelLen;
  if (ratio < th.lo || ratio > th.hi) return { ok: false, score, reversed, reason: "length" };

  // High leniency forgives direction + exact endpoints; lower levels enforce
  // correct stroke direction and that the ends land on the right spots.
  if (level === "HIGH") {
    return { ok: mean <= th.avg, score, reversed };
  }
  if (reversed) return { ok: false, score, reversed: true, reason: "reversed" };
  const endsOk = dist(drawn[0], model[0]) <= th.ends && dist(drawn[N - 1], model[N - 1]) <= th.ends;
  if (!endsOk) return { ok: false, score, reversed, reason: "ends" };
  if (fwd > th.avg) return { ok: false, score, reversed, reason: "shape" };
  return { ok: true, score, reversed };
}
