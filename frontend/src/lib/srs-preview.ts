import type { AnkiSrsSettingDTO, SrsAlgorithmConfigDTO } from "@/types";

/**
 * Shared Anki-SM2 settings parsing + a small scheduling simulator.
 *
 * Both the deck study-settings modal and the standalone preview page import
 * from here so the numbers and equations they show always agree.
 */

export interface AlgorithmDraft {
  learningSteps: string;
  relearningSteps: string;
  graduatingIntervalDays: number;
  easyIntervalDays: number;
  maxIntervalDays: number;
  startingEase: number;
  minEase: number;
  easyBonus: number;
  hardInterval: number;
  intervalModifier: number;
  newInterval: number;
}

export interface SettingsDraft extends AlgorithmDraft {
  algorithmConfigId: number;
  targetRetention: number;
  maxReviewsPerDay: number;
  maxItemsPerDay: number;
  buryRelatedItems: boolean;
}

export const DEFAULT_ALGORITHM: AlgorithmDraft = {
  learningSteps: "1m 10m",
  relearningSteps: "10m",
  graduatingIntervalDays: 1,
  easyIntervalDays: 4,
  maxIntervalDays: 36500,
  startingEase: 2.5,
  minEase: 1.3,
  easyBonus: 1.3,
  hardInterval: 1.2,
  intervalModifier: 1,
  newInterval: 0,
};

export const DEFAULT_DRAFT: SettingsDraft = {
  algorithmConfigId: 0,
  targetRetention: 0.9,
  maxReviewsPerDay: 100,
  maxItemsPerDay: 20,
  buryRelatedItems: true,
  ...DEFAULT_ALGORITHM,
};

const STEP_PATTERN = /^\d+(m|h|d)?$/i;

export function clamp(value: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function sanitizeSteps(value: string, fallback: string) {
  const tokens = value
    .replace(/,/g, " ")
    .split(/\s+/)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean)
    .filter((token) => STEP_PATTERN.test(token));

  return tokens.length > 0 ? tokens.join(" ") : fallback;
}

function readNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readSteps(value: unknown, fallback: string) {
  if (Array.isArray(value)) return sanitizeSteps(value.join(" "), fallback);
  if (typeof value === "string") return sanitizeSteps(value, fallback);
  return fallback;
}

export function parseAlgorithmConfig(configJson?: string | null): AlgorithmDraft {
  if (!configJson?.trim()) return DEFAULT_ALGORITHM;

  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    return {
      learningSteps: readSteps(parsed.learningSteps, DEFAULT_ALGORITHM.learningSteps),
      relearningSteps: readSteps(parsed.relearningSteps, DEFAULT_ALGORITHM.relearningSteps),
      graduatingIntervalDays: clamp(readNumber(parsed.graduatingIntervalDays, DEFAULT_ALGORITHM.graduatingIntervalDays), 1, 36500, DEFAULT_ALGORITHM.graduatingIntervalDays),
      easyIntervalDays: clamp(readNumber(parsed.easyIntervalDays, DEFAULT_ALGORITHM.easyIntervalDays), 1, 36500, DEFAULT_ALGORITHM.easyIntervalDays),
      maxIntervalDays: clamp(readNumber(parsed.maxIntervalDays, DEFAULT_ALGORITHM.maxIntervalDays), 1, 36500, DEFAULT_ALGORITHM.maxIntervalDays),
      startingEase: clamp(readNumber(parsed.startingEase, DEFAULT_ALGORITHM.startingEase), 1.3, 5, DEFAULT_ALGORITHM.startingEase),
      minEase: clamp(readNumber(parsed.minEase, DEFAULT_ALGORITHM.minEase), 1.3, 5, DEFAULT_ALGORITHM.minEase),
      easyBonus: clamp(readNumber(parsed.easyBonus, DEFAULT_ALGORITHM.easyBonus), 1, 5, DEFAULT_ALGORITHM.easyBonus),
      hardInterval: clamp(readNumber(parsed.hardInterval, DEFAULT_ALGORITHM.hardInterval), 1, 5, DEFAULT_ALGORITHM.hardInterval),
      intervalModifier: clamp(readNumber(parsed.intervalModifier, DEFAULT_ALGORITHM.intervalModifier), 0.1, 5, DEFAULT_ALGORITHM.intervalModifier),
      newInterval: clamp(readNumber(parsed.newInterval, DEFAULT_ALGORITHM.newInterval), 0, 1, DEFAULT_ALGORITHM.newInterval),
    };
  } catch {
    return DEFAULT_ALGORITHM;
  }
}

/* ──────────────────────────────────────────────────────────────────────────
   FSRS (Free Spaced Repetition Scheduler) — FUTURE ENHANCEMENT.

   FSRS does NOT use ease_factor. It schedules from a memory model
   (Difficulty / Stability / Retrievability) driven by a desired-retention
   target. The scheduler itself is a backend skeleton today (review returns 501),
   so the UI only READS an FSRS preset's config for display — it never edits the
   parameters by hand. These helpers are additive and never touch the SM-2 path.
   ────────────────────────────────────────────────────────────────────────── */

export interface FsrsConfigView {
  /** Target recall probability when a card becomes due (0.70–0.98). */
  desiredRetention: number;
  maximumIntervalDays: number;
  fsrsVersion: string;
  /** Model weights — managed by the optimizer, shown read-only. */
  parameters: number[];
  rescheduleCardsOnChange: boolean;
}

export const DEFAULT_FSRS: FsrsConfigView = {
  desiredRetention: 0.9,
  maximumIntervalDays: 36500,
  fsrsVersion: "—",
  parameters: [],
  rescheduleCardsOnChange: false,
};

/** True when the preset schedules with FSRS (vs SM-2 / default). */
export function isFsrsAlgorithm(algorithm?: SrsAlgorithmConfigDTO | null): boolean {
  return (algorithm?.algorithmType ?? "SM2").toUpperCase() === "FSRS";
}

export function parseFsrsConfig(configJson?: string | null): FsrsConfigView {
  if (!configJson?.trim()) return DEFAULT_FSRS;
  try {
    const parsed = JSON.parse(configJson) as Record<string, unknown>;
    const rawParams = parsed.parameters;
    const parameters = Array.isArray(rawParams)
      ? rawParams.map((value) => Number(value)).filter((value) => Number.isFinite(value))
      : [];
    return {
      desiredRetention: clamp(readNumber(parsed.desiredRetention, DEFAULT_FSRS.desiredRetention), 0.7, 0.98, DEFAULT_FSRS.desiredRetention),
      maximumIntervalDays: clamp(readNumber(parsed.maximumIntervalDays ?? parsed.maxIntervalDays, DEFAULT_FSRS.maximumIntervalDays), 1, 36500, DEFAULT_FSRS.maximumIntervalDays),
      fsrsVersion: typeof parsed.fsrsVersion === "string" && parsed.fsrsVersion.trim() ? parsed.fsrsVersion : DEFAULT_FSRS.fsrsVersion,
      parameters,
      rescheduleCardsOnChange: Boolean(parsed.rescheduleCardsOnChange),
    };
  } catch {
    return DEFAULT_FSRS;
  }
}

export function normalizeSetting(
  setting: AnkiSrsSettingDTO | null,
  algorithm?: SrsAlgorithmConfigDTO | null,
): SettingsDraft {
  return {
    ...DEFAULT_DRAFT,
    ...parseAlgorithmConfig(algorithm?.configJson),
    algorithmConfigId: setting?.algorithmConfigId ?? algorithm?.id ?? 0,
    targetRetention: setting?.targetRetention ?? DEFAULT_DRAFT.targetRetention,
    maxReviewsPerDay: setting?.maxReviewsPerDay ?? DEFAULT_DRAFT.maxReviewsPerDay,
    maxItemsPerDay: setting?.maxItemsPerDay ?? DEFAULT_DRAFT.maxItemsPerDay,
    buryRelatedItems: setting?.buryRelatedItems ?? DEFAULT_DRAFT.buryRelatedItems,
  };
}

export function normalizeDraft(draft: SettingsDraft): SettingsDraft {
  const graduatingIntervalDays = Math.round(clamp(draft.graduatingIntervalDays, 1, 36500, DEFAULT_ALGORITHM.graduatingIntervalDays));
  const easyIntervalDays = Math.max(graduatingIntervalDays + 1, Math.round(clamp(draft.easyIntervalDays, 1, 36500, DEFAULT_ALGORITHM.easyIntervalDays)));
  const maxIntervalDays = Math.max(easyIntervalDays, Math.round(clamp(draft.maxIntervalDays, 1, 36500, DEFAULT_ALGORITHM.maxIntervalDays)));
  const minEase = clamp(draft.minEase, 1.3, 5, DEFAULT_ALGORITHM.minEase);

  return {
    ...draft,
    learningSteps: sanitizeSteps(draft.learningSteps, DEFAULT_ALGORITHM.learningSteps),
    relearningSteps: sanitizeSteps(draft.relearningSteps, DEFAULT_ALGORITHM.relearningSteps),
    graduatingIntervalDays,
    easyIntervalDays,
    maxIntervalDays,
    startingEase: clamp(draft.startingEase, minEase, 5, DEFAULT_ALGORITHM.startingEase),
    minEase,
    easyBonus: clamp(draft.easyBonus, 1, 5, DEFAULT_ALGORITHM.easyBonus),
    hardInterval: clamp(draft.hardInterval, 1, 5, DEFAULT_ALGORITHM.hardInterval),
    intervalModifier: clamp(draft.intervalModifier, 0.1, 5, DEFAULT_ALGORITHM.intervalModifier),
    newInterval: clamp(draft.newInterval, 0, 1, DEFAULT_ALGORITHM.newInterval),
    targetRetention: clamp(draft.targetRetention, 0.7, 0.98, DEFAULT_DRAFT.targetRetention),
    maxReviewsPerDay: Math.round(clamp(draft.maxReviewsPerDay, 0, 99999, DEFAULT_DRAFT.maxReviewsPerDay)),
    maxItemsPerDay: Math.round(clamp(draft.maxItemsPerDay, 0, 9999, DEFAULT_DRAFT.maxItemsPerDay)),
  };
}

export function toAlgorithmConfigJson(draft: SettingsDraft) {
  const normalized = normalizeDraft(draft);
  return JSON.stringify({
    scheduler: "ANKI_SM2",
    learningSteps: normalized.learningSteps,
    relearningSteps: normalized.relearningSteps,
    graduatingIntervalDays: normalized.graduatingIntervalDays,
    easyIntervalDays: normalized.easyIntervalDays,
    maxIntervalDays: normalized.maxIntervalDays,
    startingEase: Number(normalized.startingEase.toFixed(2)),
    minEase: Number(normalized.minEase.toFixed(2)),
    easyBonus: Number(normalized.easyBonus.toFixed(2)),
    hardInterval: Number(normalized.hardInterval.toFixed(2)),
    intervalModifier: Number(normalized.intervalModifier.toFixed(2)),
    newInterval: Number(normalized.newInterval.toFixed(2)),
  });
}

export function retentionLabel(value: number) {
  if (value >= 0.94) return "Conservative";
  if (value <= 0.82) return "Fast";
  return "Balanced";
}

export function firstStep(steps: string) {
  return sanitizeSteps(steps, DEFAULT_ALGORITHM.learningSteps).split(" ")[0] ?? "1m";
}

export function secondStepOrGraduate(steps: string, graduateDays: number) {
  const tokens = sanitizeSteps(steps, DEFAULT_ALGORITHM.learningSteps).split(" ");
  return tokens[1] ?? `${graduateDays}d`;
}

/* ──────────────────────────────────────────────────────────────────────────
   Scheduling simulator — answer a card and see how its next due date moves.
   This mirrors Anki SM-2 closely enough to teach how the numbers interact.
   ────────────────────────────────────────────────────────────────────────── */

export type Rating = "again" | "hard" | "good" | "easy";

export interface CardState {
  /** Where the card is in its lifecycle. */
  phase: "new" | "learning" | "relearning" | "review";
  /** Index into the (re)learning steps while in a step phase. */
  stepIndex: number;
  /** Current scheduled gap, in minutes (sub-day for steps, days×1440 for review). */
  intervalMin: number;
  /** Ease multiplier (only meaningful once the card is a review card). */
  ease: number;
}

const DAY_MIN = 1440;

/** Convert a step token ("15", "10m", "2h", "1d") to minutes. No suffix = minutes. */
export function stepToMinutes(token: string): number {
  const m = token.trim().toLowerCase().match(/^(\d+)(m|h|d)?$/);
  if (!m) return 1;
  const n = Number(m[1]);
  switch (m[2]) {
    case "h": return n * 60;
    case "d": return n * DAY_MIN;
    default: return n; // minutes
  }
}

/** A friendly label for a minute count: "10m", "3h", "4d". */
export function formatInterval(min: number): string {
  if (min < 60) return `${Math.max(1, Math.round(min))}m`;
  if (min < DAY_MIN) return `${Math.round(min / 60)}h`;
  return `${Math.max(1, Math.round(min / DAY_MIN))}d`;
}

/**
 * Anki's Hard delay for a learning card: the average of the current step and
 * the next step, or current × 1.5 when there is no next step. Returns minutes.
 */
function hardStepMinutes(steps: string[], idx: number): number {
  const cur = stepToMinutes(steps[idx] ?? steps[0] ?? "1m");
  if (idx + 1 >= steps.length) return cur * 1.5;
  const next = stepToMinutes(steps[idx + 1]);
  return (cur + Math.max(cur, next)) / 2;
}

/** Equation text describing the Hard delay (mirrors hardStepMinutes). */
function hardEquation(steps: string[], idx: number, min: number): string {
  if (idx + 1 >= steps.length) {
    return `Hard → ${steps[idx] ?? "1m"} × 1.5 = ${formatInterval(min)}`;
  }
  return `Hard → average of ${steps[idx]} & ${steps[idx + 1]} = ${formatInterval(min)}`;
}

/** The card every simulation starts from: a brand-new, never-studied card. */
export function initialCardState(): CardState {
  return { phase: "new", stepIndex: -1, intervalMin: 0, ease: 0 };
}

export interface RatingOutcome {
  rating: Rating;
  next: CardState;
  /** Human label of the resulting gap, e.g. "10m" or "4d". */
  intervalLabel: string;
  /** Plain-language equation, with the actual numbers plugged in. */
  equation: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Apply a rating to a card and return the resulting state + the equation used.
 * `draft` should already be normalized (use normalizeDraft).
 */
export function applyRating(state: CardState, rating: Rating, draft: SettingsDraft): RatingOutcome {
  const learning = sanitizeSteps(draft.learningSteps, DEFAULT_ALGORITHM.learningSteps).split(" ");
  const relearning = sanitizeSteps(draft.relearningSteps, DEFAULT_ALGORITHM.relearningSteps).split(" ");
  const mod = draft.intervalModifier;
  const maxMin = draft.maxIntervalDays * DAY_MIN;
  const cap = (min: number) => Math.min(min, maxMin);

  // ── Brand-new card (first study) ──
  // Seeing a new card already counts as being on the FIRST learning step, so
  // Good advances to the SECOND step; Again restarts the first step.
  if (state.phase === "new") {
    if (rating === "easy") {
      const days = draft.easyIntervalDays;
      return { rating, next: { phase: "review", stepIndex: 0, intervalMin: cap(days * DAY_MIN), ease: draft.startingEase }, intervalLabel: `${days}d`, equation: `Easy → graduate to easy interval = ${days}d (ease set to ${draft.startingEase})` };
    }
    if (rating === "good") {
      if (learning.length > 1) {
        const min = stepToMinutes(learning[1]);
        return { rating, next: { phase: "learning", stepIndex: 1, intervalMin: min, ease: 0 }, intervalLabel: formatInterval(min), equation: `Good → advance to next learning step = ${learning[1]}` };
      }
      const days = draft.graduatingIntervalDays;
      return { rating, next: { phase: "review", stepIndex: 0, intervalMin: cap(days * DAY_MIN), ease: draft.startingEase }, intervalLabel: `${days}d`, equation: `Good → only one learning step, so graduate = ${days}d (ease ${draft.startingEase})` };
    }
    if (rating === "hard") {
      // Hard sits between Again and Good: the average of step 1 and step 2.
      const min = hardStepMinutes(learning, 0);
      return { rating, next: { phase: "learning", stepIndex: 0, intervalMin: min, ease: 0 }, intervalLabel: formatInterval(min), equation: hardEquation(learning, 0, min) };
    }
    // again → (re)start at the first learning step
    const min = stepToMinutes(learning[0] ?? "1m");
    return { rating, next: { phase: "learning", stepIndex: 0, intervalMin: min, ease: 0 }, intervalLabel: formatInterval(min), equation: `Again → first learning step = ${learning[0] ?? "1m"}` };
  }

  // ── Learning / relearning (stepping) ──
  if (state.phase === "learning" || state.phase === "relearning") {
    const steps = state.phase === "relearning" ? relearning : learning;
    const graduateDays = state.phase === "relearning" ? draft.graduatingIntervalDays : draft.graduatingIntervalDays;

    if (rating === "again") {
      const min = stepToMinutes(steps[0] ?? "1m");
      return { rating, next: { ...state, stepIndex: 0, intervalMin: min }, intervalLabel: formatInterval(min), equation: `Again → first ${state.phase} step = ${steps[0] ?? "1m"}` };
    }
    if (rating === "hard") {
      const idx = Math.max(0, state.stepIndex);
      const min = hardStepMinutes(steps, idx);
      return { rating, next: { ...state, stepIndex: idx, intervalMin: min }, intervalLabel: formatInterval(min), equation: hardEquation(steps, idx, min) };
    }
    if (rating === "good") {
      const nextIdx = state.stepIndex + 1;
      if (nextIdx < steps.length) {
        const min = stepToMinutes(steps[nextIdx]);
        return { rating, next: { ...state, stepIndex: nextIdx, intervalMin: min }, intervalLabel: formatInterval(min), equation: `Good → next step = ${steps[nextIdx]}` };
      }
      // Graduate to a review card.
      const days = graduateDays;
      return { rating, next: { phase: "review", stepIndex: 0, intervalMin: cap(days * DAY_MIN), ease: draft.startingEase }, intervalLabel: `${days}d`, equation: `Good → graduate to graduating interval = ${days}d (ease set to ${draft.startingEase})` };
    }
    // easy → graduate immediately with the easy interval
    const days = draft.easyIntervalDays;
    return { rating, next: { phase: "review", stepIndex: 0, intervalMin: cap(days * DAY_MIN), ease: draft.startingEase }, intervalLabel: `${days}d`, equation: `Easy → graduate to easy interval = ${days}d (ease set to ${draft.startingEase})` };
  }

  // ── Review card ──
  const days = state.intervalMin / DAY_MIN;
  if (rating === "again") {
    const newEase = Math.max(draft.minEase, round2(state.ease - 0.2));
    const lapseDays = Math.max(1, Math.round(days * draft.newInterval));
    // After a lapse Anki sends the card through relearning; we show the lapse interval.
    return {
      rating,
      next: { phase: "relearning", stepIndex: -1, intervalMin: cap(lapseDays * DAY_MIN), ease: newEase },
      intervalLabel: `${lapseDays}d`,
      equation: `Again → max(1, ${Math.round(days)}d × newInterval ${draft.newInterval}) = ${lapseDays}d · ease ${state.ease} − 0.20 = ${newEase}`,
    };
  }
  if (rating === "hard") {
    const newEase = Math.max(draft.minEase, round2(state.ease - 0.15));
    const next = Math.max(1, Math.round(days * draft.hardInterval * mod));
    return {
      rating,
      next: { ...state, intervalMin: cap(next * DAY_MIN), ease: newEase },
      intervalLabel: `${next}d`,
      equation: `Hard → ${Math.round(days)}d × hardInterval ${draft.hardInterval}${mod !== 1 ? ` × mod ${mod}` : ""} = ${next}d · ease ${state.ease} − 0.15 = ${newEase}`,
    };
  }
  if (rating === "good") {
    const next = Math.max(1, Math.round(days * state.ease * mod));
    return {
      rating,
      next: { ...state, intervalMin: cap(next * DAY_MIN), ease: state.ease },
      intervalLabel: `${next}d`,
      equation: `Good → ${Math.round(days)}d × ease ${state.ease}${mod !== 1 ? ` × mod ${mod}` : ""} = ${next}d`,
    };
  }
  // easy
  const newEase = round2(state.ease + 0.15);
  const next = Math.max(1, Math.round(days * state.ease * draft.easyBonus * mod));
  return {
    rating,
    next: { ...state, intervalMin: cap(next * DAY_MIN), ease: newEase },
    intervalLabel: `${next}d`,
    equation: `Easy → ${Math.round(days)}d × ease ${state.ease} × easyBonus ${draft.easyBonus}${mod !== 1 ? ` × mod ${mod}` : ""} = ${next}d · ease + 0.15 = ${newEase}`,
  };
}

/** Compute all four outcomes from a state — used to preview the buttons. */
export function previewOutcomes(state: CardState, draft: SettingsDraft): Record<Rating, RatingOutcome> {
  return {
    again: applyRating(state, "again", draft),
    hard: applyRating(state, "hard", draft),
    good: applyRating(state, "good", draft),
    easy: applyRating(state, "easy", draft),
  };
}

/** A human description of where a card currently sits. */
export function describeState(state: CardState): string {
  if (state.phase === "new") return "New card (not studied yet)";
  if (state.phase === "review") {
    const days = Math.round(state.intervalMin / DAY_MIN);
    return `Review card · interval ${days}d · ease ${state.ease}`;
  }
  const phase = state.phase === "relearning" ? "Relearning" : "Learning";
  return `${phase} · current step ${formatInterval(state.intervalMin)}`;
}
