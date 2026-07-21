import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ankiSrsSettingApi, srsAlgorithmConfigApi } from "@/api";
import type { SrsAlgorithmConfigDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  type CardState,
  type Rating,
  type RatingOutcome,
  type SettingsDraft,
  DEFAULT_DRAFT,
  describeState,
  initialCardState,
  isFsrsAlgorithm,
  normalizeDraft,
  normalizeSetting,
  previewOutcomes,
  retentionLabel,
} from "@/lib/srs-preview";
import {
  ArrowLeft,
  Calculator,
  CalendarClock,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const DAY_MIN = 1440;

const RATING_META: Record<Rating, { label: string; tone: string; ring: string; chip: string }> = {
  again: { label: "Again", tone: "text-red-600", ring: "hover:border-red-400", chip: "bg-red-500/10 text-red-600" },
  hard: { label: "Hard", tone: "text-amber-600", ring: "hover:border-amber-400", chip: "bg-amber-500/10 text-amber-600" },
  good: { label: "Good", tone: "text-green-600", ring: "hover:border-green-400", chip: "bg-green-500/10 text-green-600" },
  easy: { label: "Easy", tone: "text-sky-600", ring: "hover:border-sky-400", chip: "bg-sky-500/10 text-sky-600" },
};

/** "today · in 10m" or "Mon, Jun 9 · in 4 days" relative to now. */
function dueLabel(intervalMin: number): string {
  if (intervalMin <= 0) return "now";
  const due = new Date(Date.now() + intervalMin * 60_000);
  if (intervalMin < DAY_MIN) {
    const mins = Math.round(intervalMin);
    const rel = mins < 60 ? `in ${mins}m` : `in ${Math.round(mins / 60)}h`;
    return `today · ${rel}`;
  }
  const days = Math.round(intervalMin / DAY_MIN);
  const date = due.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${date} · in ${days} day${days === 1 ? "" : "s"}`;
}

export default function FlashcardSchedulePreviewPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  // Settings can be handed over from the settings modal (unsaved edits) via
  // navigation state; otherwise we load this deck's saved settings.
  const passed = (location.state ?? null) as
    | { draft?: SettingsDraft; deckTitle?: string; algorithm?: SrsAlgorithmConfigDTO | null }
    | null;

  const [loading, setLoading] = useState(!passed?.draft);
  const [draft, setDraft] = useState<SettingsDraft>(passed?.draft ?? DEFAULT_DRAFT);
  const [algorithm, setAlgorithm] = useState<SrsAlgorithmConfigDTO | null>(passed?.algorithm ?? null);
  const deckTitle = passed?.deckTitle;

  const [state, setState] = useState<CardState>(() => initialCardState());
  const [history, setHistory] = useState<{ rating: Rating; label: string }[]>([]);

  // Fallback load when opened directly (no settings handed over).
  useEffect(() => {
    if (passed?.draft || !deckId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const setting = await ankiSrsSettingApi.getForDeck(Number(deckId));
        let algo: SrsAlgorithmConfigDTO | null = null;
        if (setting?.algorithmConfigId) {
          try {
            algo = await srsAlgorithmConfigApi.getById(String(setting.algorithmConfigId));
          } catch {
            algo = null;
          }
        }
        if (cancelled) return;
        setAlgorithm(algo);
        setDraft(normalizeDraft(normalizeSetting(setting, algo)));
      } catch {
        if (!cancelled) setDraft(DEFAULT_DRAFT);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [deckId, passed?.draft]);

  const outcomes = useMemo(() => previewOutcomes(state, draft), [state, draft]);

  const choose = (rating: Rating) => {
    const outcome = outcomes[rating];
    setHistory((prev) => [...prev, { rating, label: outcome.intervalLabel }]);
    setState(outcome.next);
  };

  const reset = () => {
    setState(initialCardState());
    setHistory([]);
  };

  const indicators: { label: string; value: string; desc: string }[] = [
    { label: "New cards / day", value: String(draft.maxItemsPerDay), desc: "How many brand-new cards are introduced each day." },
    { label: "Max reviews / day", value: String(draft.maxReviewsPerDay), desc: "Daily cap on review cards that are due." },
    { label: "Target retention", value: `${Math.round(draft.targetRetention * 100)}% · ${retentionLabel(draft.targetRetention)}`, desc: "How well you aim to remember. Higher = reviews come more often." },
    { label: "Learning steps", value: draft.learningSteps, desc: "Short delays a new card passes through before it graduates." },
    { label: "Relearning steps", value: draft.relearningSteps, desc: "Delays a lapsed card passes through after you press Again." },
    { label: "Graduating interval", value: `${draft.graduatingIntervalDays}d`, desc: "First review gap once a new card graduates with Good." },
    { label: "Easy interval", value: `${draft.easyIntervalDays}d`, desc: "First review gap when a new card is rated Easy." },
    { label: "Starting ease", value: `×${draft.startingEase}`, desc: "Initial multiplier that grows a card's interval on each Good." },
    { label: "Minimum ease", value: `×${draft.minEase}`, desc: "The lowest the ease multiplier can fall to." },
    { label: "Hard interval", value: `×${draft.hardInterval}`, desc: "Multiplier applied when you press Hard." },
    { label: "Easy bonus", value: `×${draft.easyBonus}`, desc: "Extra multiplier applied when you press Easy." },
    { label: "Maximum interval", value: `${draft.maxIntervalDays}d`, desc: "Hard cap on how far apart two reviews can be." },
    { label: "Interval modifier", value: `×${draft.intervalModifier}`, desc: "Global multiplier applied to every review interval." },
    { label: "New interval", value: `${Math.round(draft.newInterval * 100)}%`, desc: "Fraction of the interval kept after a lapse (Again on a review card)." },
  ];

  const formulas = [
    { when: "Good (review)", eq: "next = interval × ease × intervalModifier" },
    { when: "Hard (review)", eq: "next = interval × hardInterval × intervalModifier · ease − 0.15" },
    { when: "Easy (review)", eq: "next = interval × ease × easyBonus × intervalModifier · ease + 0.15" },
    { when: "Again (review)", eq: "next = max(1, interval × newInterval) · ease − 0.20" },
    { when: "Hard (learning)", eq: "next = average of current & next step (or step × 1.5 if it's the last)" },
    { when: "New / learning", eq: "uses the learning steps, then the graduating / easy interval" },
  ];

  const pathName = {
    "/library": "Library",
    [`/deck/${deckId}`]: deckTitle ?? "Deck",
    [`/deck/${deckId}/srs-preview`]: "Schedule preview",
  };

  if (loading) {
    return (
      <MainLayout pathName={pathName} pageScroll>
        <div className="flex h-60 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pathName={pathName} pageScroll>
      <div className="mx-auto w-full max-w-5xl space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/deck/${deckId}`)}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back to deck
            </button>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                Schedule preview
              </h1>
              <p className="text-xs text-muted-foreground">
                {deckTitle ? `${deckTitle} · ` : ""}see how a card's next date changes for each answer
              </p>
            </div>
          </div>
          <span className="rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-600">
            {isFsrsAlgorithm(algorithm) ? "FSRS-5" : "SM-2"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* ── Interactive simulator ── */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarClock className="size-4 text-primary" /> Try it out
            </div>

            {/* Current card */}
            <div className="rounded-xl border border-border bg-background/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current card</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{describeState(state)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Next due: <span className="font-medium text-foreground">{state.phase === "new" ? "—" : dueLabel(state.intervalMin)}</span>
              </p>
            </div>

            {/* Rating buttons — each previews its resulting date */}
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(RATING_META) as Rating[]).map((r) => {
                const meta = RATING_META[r];
                const o = outcomes[r];
                return (
                  <button
                    key={r}
                    onClick={() => choose(r)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-xl border border-border bg-background/70 p-3 text-left transition-colors",
                      meta.ring,
                    )}
                  >
                    <span className={cn("text-sm font-bold", meta.tone)}>{meta.label}</span>
                    <span className="text-lg font-bold tabular-nums text-foreground">{o.intervalLabel}</span>
                    <span className="text-[11px] text-muted-foreground">{dueLabel(o.next.intervalMin)}</span>
                  </button>
                );
              })}
            </div>

            {/* History */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your answers</p>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-3.5" /> Reset
                </button>
              </div>
              {history.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                  Press a button above to walk a card through its schedule.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {history.map((h, i) => (
                    <span key={i} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", RATING_META[h.rating].chip)}>
                      {RATING_META[h.rating].label}
                      <span className="text-foreground/70">→ {h.label}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Equations for the current step ── */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Calculator className="size-4 text-primary" /> How each date is calculated
            </div>
            <p className="text-xs text-muted-foreground">
              From the card's current state, here's the exact math behind each button:
            </p>
            <div className="space-y-2">
              {(Object.keys(RATING_META) as Rating[]).map((r) => (
                <EquationRow key={r} rating={r} outcome={outcomes[r]} />
              ))}
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">General formulas</p>
              <ul className="space-y-1.5">
                {formulas.map((f) => (
                  <li key={f.when} className="text-xs">
                    <span className="font-semibold text-foreground">{f.when}: </span>
                    <code className="text-muted-foreground">{f.eq}</code>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>

        {/* ── Indicators reference ── */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Info className="size-4 text-primary" /> What the numbers mean
          </div>
          <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {indicators.map((it) => (
              <div key={it.label} className="flex items-start justify-between gap-4 border-b border-border/50 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{it.label}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{it.desc}</p>
                </div>
                <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs font-semibold tabular-nums text-foreground">
                  {it.value}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}

function EquationRow({ rating, outcome }: { rating: Rating; outcome: RatingOutcome }) {
  const meta = RATING_META[rating];
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className={cn("text-sm font-bold", meta.tone)}>{meta.label}</span>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-bold tabular-nums text-foreground">
          {outcome.intervalLabel}
        </span>
      </div>
      <code className="block text-[11px] leading-relaxed text-muted-foreground">{outcome.equation}</code>
    </div>
  );
}
