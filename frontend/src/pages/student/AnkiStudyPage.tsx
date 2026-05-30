import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ankiStudyApi, flashcardApi } from "@/api";
import type { AnkiStudyCard, AnkiRating } from "@/api/features/library/ankiStudy.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Brush, ChevronLeft, Maximize2, Minimize2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { FlashcardRenderDTO } from "@/types";
import { AnkiCardEditModal } from "./AnkiCardEditModal";
import { TemplateEditorModal } from "./TemplateEditorModal";

/* ── SM2 preview: interval each button would produce (display only) ── */
function fallbackPreview(card: AnkiStudyCard, rating: AnkiRating): string {
  if (rating === "AGAIN") return "< 1m";

  const quality = rating === "HARD" ? 3 : rating === "EASY" ? 5 : 4;
  const rep = card.reviewCount;
  const ef = card.easeFactor;
  const iv = card.intervalDays;

  let next: number;
  if (rep === 0) {
    next = quality === 5 ? 4 : 1;
  } else if (rep === 1) {
    next = quality === 5 ? 10 : 6;
  } else {
    const base = Math.round(iv * ef);
    next = quality === 3
      ? Math.max(1, Math.round(base * 0.8))
      : quality === 5
        ? Math.round(base * 1.3)
        : base;
  }

  if (next <= 0) return "< 1d";
  if (next === 1) return "1d";
  if (next < 30) return `${next}d`;
  const months = Math.round(next / 30);
  return `${months}mo`;
}

function ratingPreview(card: AnkiStudyCard, rating: AnkiRating): string {
  const preview = {
    AGAIN: card.againPreview,
    HARD: card.hardPreview,
    GOOD: card.goodPreview,
    EASY: card.easyPreview,
  }[rating];

  return preview ?? fallbackPreview(card, rating);
}

const RATING_CONFIG: {
  rating: AnkiRating;
  label: string;
  shortcut: string;
  className: string;
}[] = [
  {
    rating: "AGAIN",
    label: "Again",
    shortcut: "1",
    className:
      "border-red-500 text-red-500 hover:bg-red-500 hover:text-white focus-visible:ring-red-500",
  },
  {
    rating: "HARD",
    label: "Hard",
    shortcut: "2",
    className:
      "border-orange-400 text-orange-500 hover:bg-orange-400 hover:text-white focus-visible:ring-orange-400",
  },
  {
    rating: "GOOD",
    label: "Good",
    shortcut: "3",
    className:
      "border-green-500 text-green-600 hover:bg-green-500 hover:text-white focus-visible:ring-green-500",
  },
  {
    rating: "EASY",
    label: "Easy",
    shortcut: "4",
    className:
      "border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white focus-visible:ring-blue-500",
  },
];

/* ──────────────────────────────────────────
   Page
────────────────────────────────────────── */
type QueueStats = { new: number; learning: number; review: number };

function isLearningState(card: AnkiStudyCard) {
  return card.state === "LEARNING" || card.state === "RELEARNING";
}

function returnsTodayOrEarlier(nextReviewAt?: string) {
  if (!nextReviewAt) return true;

  const nextReview = new Date(nextReviewAt);
  if (Number.isNaN(nextReview.getTime())) return true;

  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  return nextReview <= endOfToday;
}

function shouldTrackAsSessionLearning(card: AnkiStudyCard) {
  return isLearningState(card) && returnsTodayOrEarlier(card.nextReviewAt);
}

function countMainQueueStats(cards: AnkiStudyCard[]): QueueStats {
  return cards.reduce<QueueStats>(
    (acc, card) => {
      if (card.state === "NEW") acc.new += 1;
      else if (isLearningState(card)) acc.learning += 1;
      else acc.review += 1;
      return acc;
    },
    { new: 0, learning: 0, review: 0 }
  );
}

export default function AnkiStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deckTitle, setDeckTitle] = useState("");
  const [queue, setQueue] = useState<AnkiStudyCard[]>([]);
  const [againQueue, setAgainQueue] = useState<AnkiStudyCard[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalStudied, setTotalStudied] = useState(0);
  const [totalNew, setTotalNew] = useState(0);
  const [totalLearning, setTotalLearning] = useState(0);
  const [totalReview, setTotalReview] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [sessionStats, setSessionStats] = useState<QueueStats>({ new: 0, learning: 0, review: 0 });
  const [editOpen, setEditOpen] = useState(false);
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [fullView, setFullView] = useState(false);
  const [renderData, setRenderData] = useState<FlashcardRenderDTO | null>(null);

  /* ── Load queue ── */
  const loadQueue = (showSpinner = true) => {
    if (!deckId) return;
    if (showSpinner) setLoading(true);
    ankiStudyApi
      .getQueue(Number(deckId))
      .then((data) => {
        setDeckTitle(data.deckTitle);
        setQueue(data.cards);
        setAgainQueue([]);
        setSessionStats(countMainQueueStats(data.cards));
        setTotalNew(data.totalNew);
        setTotalLearning(data.totalLearning ?? 0);
        setTotalReview(data.totalReview ?? data.totalDue);
        setTotalDue(data.totalDue);
      })
      .catch(() => toast.error("Failed to load study queue."))
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  /* ── Keyboard shortcuts — disabled while a modal is open or while editing a field ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture shortcuts while a dialog is open — the user might be typing
      // template/CSS code, card text, etc. and {1,2,3,4} or Space would otherwise
      // accidentally rate the current card and end the session.
      if (editOpen || templateEditorOpen) return;

      // Also skip if focus is inside any editable element (defensive, in case a
      // non-Dialog editor opens later).
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          target.isContentEditable
        ) {
          return;
        }
      }

      if (e.key === "Escape" && fullView) {
        setFullView(false);
        return;
      }
      if (submitting || queue.length === 0) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
      if (flipped) {
        if (e.key === "1") handleRate("AGAIN");
        if (e.key === "2") handleRate("HARD");
        if (e.key === "3") handleRate("GOOD");
        if (e.key === "4") handleRate("EASY");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flipped, submitting, queue, fullView, editOpen, templateEditorOpen]);

  /* ── Lock scroll while in full view ── */
  useEffect(() => {
    if (!fullView) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullView]);

  /* ── Fetch rendered HTML when current card changes ── */
  const currentFlashcardId = queue[0]?.flashcardId ?? null;
  useEffect(() => {
    if (currentFlashcardId == null) {
      setRenderData(null);
      return;
    }
    let cancelled = false;
    flashcardApi
      .getRender(currentFlashcardId)
      .then((data) => {
        if (!cancelled) setRenderData(data);
      })
      .catch(() => {
        if (!cancelled) setRenderData(null);
      });

    return () => {
      cancelled = true;
    };
  }, [currentFlashcardId]);

  const refetchRender = () => {
    if (currentFlashcardId == null) return;
    flashcardApi
      .getRender(currentFlashcardId)
      .then((data) => setRenderData(data))
      .catch(() => setRenderData(null));
  };

  /* ── Rate current card ── */
  const handleRate = async (rating: AnkiRating) => {
    if (!deckId || submitting || queue.length === 0) return;
    const card = queue[0];
    setSubmitting(true);
    try {
      const updated = await ankiStudyApi.review({
        deckId: Number(deckId),
        flashcardId: card.flashcardId,
        rating,
      });

      setTotalStudied((n) => n + 1);
      setFlipped(false);

      const rest = queue.slice(1);
      const shouldRequeueForLearning = shouldTrackAsSessionLearning(updated);
      let nextAgainQueue = shouldRequeueForLearning ? [...againQueue, updated] : [...againQueue];
      let nextQueue = rest;

      if (nextQueue.length === 0 && nextAgainQueue.length > 0) {
        const [next, ...remainingAgain] = nextAgainQueue;
        nextQueue = next ? [next] : [];
        nextAgainQueue = remainingAgain;
      }

      setQueue(nextQueue);
      setAgainQueue(nextAgainQueue);
      const mainStats = countMainQueueStats(nextQueue);
      setSessionStats({ ...mainStats, learning: mainStats.learning + nextAgainQueue.length });

      
            // Main queue empty — pull from again-queue

        // HARD / GOOD / EASY — card scheduled for future, remove from session
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDone = !loading && queue.length === 0 && againQueue.length === 0;
  const current = queue[0] ?? null;
  const remaining = queue.length + againQueue.length;

  const content = (
      <div className={cn(
        "w-full space-y-6",
        fullView
          ? "px-4 py-6 sm:py-10"
          : "pb-16 pt-2"
      )}>

        {/* Header */}
        <div className="flex items-center justify-between">
          {fullView ? (
            <span />
          ) : (
            <button
              onClick={() => navigate("/library")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" />
              Back to library
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFullView((v) => !v)}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title={fullView ? "Exit full view (Esc)" : "Full view"}
            >
              {fullView ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
              {fullView ? "Exit full view" : "Full view"}
            </button>
          </div>
        </div>

        {/* Deck title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            {deckTitle || "Loading…"}
          </h1>
          {!loading && !isDone && (
            <AnkiQueueSummary
              remaining={remaining}
              liveNew={sessionStats.new}
              liveLearning={sessionStats.learning}
              liveReview={sessionStats.review}
              totalNew={totalNew}
              totalLearning={totalLearning}
              totalReview={totalReview}
              totalDue={totalDue}
            />
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="size-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {/* ── Empty (no cards due) ── */}
        {!loading && queue.length === 0 && !isDone && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <BookOpen className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No cards due for review.</p>
          </div>
        )}

        {/* ── Done ── */}
        {isDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-6 py-16"
          >
            <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="size-10 text-primary" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Session complete!</h2>
              <p className="text-sm text-muted-foreground">
                You reviewed {totalStudied} card{totalStudied !== 1 ? "s" : ""}.
                Cards scheduled with SM2 spaced repetition.
              </p>
            </div>
            <button
              onClick={() => navigate("/library")}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="size-4" />
              Back to library
            </button>
          </motion.div>
        )}

        {/* ── Study UI ── */}
        {!loading && current && !isDone && (
          <>
            {/* State badge + edit */}
            <div className="flex items-center gap-2">
              <StateBadge state={current.state} />
              {current.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Interval: {current.intervalDays}d · Reviews: {current.reviewCount}
                </span>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="ml-auto flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit this card"
              >
                <Pencil className="size-3.5" />
                Edit card
              </button>
              <button
                onClick={() => setTemplateEditorOpen(true)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title="Edit template (affects all cards using this template)"
              >
                <Brush className="size-3.5" />
                Edit template
              </button>
            </div>

            {/* Open field — content shows directly on the page (no card chrome).
               Switching sides uses a "deck shuffle" depth motion: the current
               side pushes back into the stack while the new side comes forward. */}
            <div
              className={cn(
                "relative cursor-pointer select-none",
                fullView ? "min-h-[60vh]" : "min-h-64"
              )}
              onClick={() => !submitting && setFlipped((f) => !f)}
              style={{ perspective: 1400 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${current.flashcardId}-${flipped}`}
                  initial={{ opacity: 0, scale: 0.9, y: 28, z: -160 }}
                  animate={{ opacity: 1, scale: 1, y: 0, z: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -28, z: -160 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformStyle: "preserve-3d" }}
                  className="p-0"
                >
                  <div className="flex flex-col">
                    <span className="shrink-0 pt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {flipped ? "Answer" : "Question"}
                    </span>
                    <span className="mx-auto mt-2 mb-1 h-px w-12 bg-border/70" />

                    {hasTemplateRender(renderData, flipped) ? (
                      <TemplateSideRender
                        html={flipped ? renderData!.backHtml : renderData!.frontHtml}
                        styling={renderData!.styling}
                        fullView={fullView}
                        onFlip={() => !submitting && setFlipped((f) => !f)}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-3 px-10 py-6">
                        <PlainSideRender
                          card={current}
                          flipped={flipped}
                          fullView={fullView}
                        />
                      </div>
                    )}

                    {!flipped && (
                      <p className="shrink-0 pb-3 text-center text-[10px] text-muted-foreground/50">
                        Click to reveal · Space
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Rating buttons — visible after flip */}
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-stretch justify-center gap-3"
                >
                  {RATING_CONFIG.map(({ rating, label, shortcut, className }) => (
                    <button
                      key={rating}
                      onClick={() => handleRate(rating)}
                      disabled={submitting}
                      className={cn(
                        "flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl border-2 text-sm font-semibold transition-colors disabled:opacity-50 min-w-20",
                        className
                      )}
                    >
                      <span className="text-xs font-normal opacity-70">
                        {ratingPreview(current, rating)}
                      </span>
                      <span>{label}</span>
                      <span className="text-[10px] opacity-50">[{shortcut}]</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keyboard hint */}
            {!flipped && (
              <p className="text-center text-[10px] text-muted-foreground/40">
                Space / Enter to reveal
              </p>
            )}
            {flipped && (
              <p className="text-center text-[10px] text-muted-foreground/40">
                Keys: 1 Again · 2 Hard · 3 Good · 4 Easy
              </p>
            )}
          </>
        )}
      </div>
  );

  const modal = current && (
    <>
      <AnkiCardEditModal
        flashcardId={current.flashcardId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          loadQueue(false);
          refetchRender();
        }}
      />
      <TemplateEditorModal
        deckId={Number(deckId)}
        open={templateEditorOpen}
        onClose={() => setTemplateEditorOpen(false)}
        onSaved={() => refetchRender()}
      />
    </>
  );

  if (fullView) {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
        {content}
        {modal}
      </div>
    );
  }

  return (
    <MainLayout
      pathName={{
        "/library": "Library",
        [`/deck/${deckId}/anki`]: deckTitle || "Anki Study",
      }}
    >
      {content}
      {modal}
    </MainLayout>
  );
}

/* ── Template render helpers ── */
/** Resolve the app's theme foreground colour so iframe content stays readable
 *  on both light and dark backgrounds (the iframe is isolated and can't see the
 *  app's CSS variables, and bare `inherit` falls back to the UA default black). */
function AnkiQueueSummary({
  remaining,
  liveNew,
  liveLearning,
  liveReview,
  totalNew,
  totalLearning,
  totalReview,
  totalDue,
}: {
  remaining: number;
  liveNew: number;
  liveLearning: number;
  liveReview: number;
  totalNew: number;
  totalLearning: number;
  totalReview: number;
  totalDue: number;
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <div className="text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{remaining}</span>{" "}
        card{remaining !== 1 ? "s" : ""} remaining
      </div>

      <div
        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card px-3 py-2 text-sm shadow-sm"
        title={`Available today: ${totalNew} new, ${totalLearning} learning, ${totalReview} to review, ${totalDue} due total`}
      >
        <QueueStat label="New" value={liveNew} dotClassName="bg-blue-500" valueClassName="text-blue-500" />
        <QueueStat label="Learning" value={liveLearning} dotClassName="bg-orange-400" valueClassName="text-orange-500" />
        <QueueStat label="To Review" value={liveReview} dotClassName="bg-green-500" valueClassName="text-green-600" />
      </div>
    </div>
  );
}

function QueueStat({
  label,
  value,
  dotClassName,
  valueClassName,
}: {
  label: string;
  value: number;
  dotClassName: string;
  valueClassName: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className={cn("size-2 rounded-full", dotClassName)} />
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-bold tabular-nums", valueClassName)}>{value}</span>
    </span>
  );
}

function appForegroundColor(): string {
  if (typeof window === "undefined") return "#1f2937";
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
  return v || "#1f2937";
}

function hasTemplateRender(
  render: FlashcardRenderDTO | null,
  flipped: boolean
): boolean {
  if (!render) return false;
  const html = flipped ? render.backHtml : render.frontHtml;
  return typeof html === "string" && html.trim().length > 0;
}

function TemplateSideRender({
  html,
  styling,
  fullView,
  onFlip,
}: {
  html: string;
  styling: string | null;
  fullView: boolean;
  onFlip: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const minH = fullView ? 320 : 200;
  const [height, setHeight] = useState<number>(minH);

  // Keep the latest flip handler in a ref so the iframe effect doesn't need to
  // re-run (and re-attach listeners) on every parent render.
  const onFlipRef = useRef(onFlip);
  onFlipRef.current = onFlip;

  // The iframe is isolated, so `inherit` would resolve to the UA default (black)
  // — unreadable on a dark app background. Inject the app's theme foreground.
  const fg = appForegroundColor();
  const srcDoc = useMemo(
    () => `<!doctype html><html><head><meta charset="utf-8"><style>
:root { color-scheme: light dark; }
html, body {
  margin: 0;
  padding: 16px 20px;
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: transparent;
  color: ${fg};
  overflow: hidden;
  cursor: pointer;
}
/* Let genuinely interactive elements keep their own cursor/behavior */
a, button, input, textarea, select, audio, video, [contenteditable] { cursor: auto; }
img, video { max-width: 100%; height: auto; }
audio { max-width: 100%; }
${styling ?? ""}
</style></head><body><div class="card">${html}</div></body></html>`,
    [html, styling, fg]
  );

  /* Allow-same-origin lets us measure iframe content height from the parent
     and forward clicks for flip. Scripts are still blocked because
     allow-scripts is not in the sandbox list. */
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const measure = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) return;
        const measured = Math.max(
          doc.body.scrollHeight,
          doc.documentElement.scrollHeight
        );
        if (measured > 0) setHeight(Math.max(minH, measured));
      } catch {
        // ignore — cross-origin/sandbox issues
      }
    };

    // Clicking the rendered card flips it — but ignore clicks that land on
    // interactive content (audio/video controls, links, form fields).
    const onClick = (e: Event) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("a, button, input, textarea, select, audio, video, [contenteditable]")) {
        return;
      }
      onFlipRef.current();
    };

    const attachClick = () => {
      try {
        iframe.contentDocument?.addEventListener("click", onClick);
      } catch {
        // ignore
      }
    };

    const onLoad = () => {
      measure();
      attachClick();
    };

    iframe.addEventListener("load", onLoad);
    // srcDoc may already be parsed by the time this effect runs
    attachClick();
    // images & fonts load asynchronously, so re-measure a few times
    const timers = [
      window.setTimeout(measure, 80),
      window.setTimeout(measure, 320),
      window.setTimeout(measure, 800),
    ];
    return () => {
      iframe.removeEventListener("load", onLoad);
      try {
        iframe.contentDocument?.removeEventListener("click", onClick);
      } catch {
        // ignore
      }
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [srcDoc, minH]);

  return (
    <iframe
      ref={iframeRef}
      title="Card content"
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      style={{ height: `${height}px` }}
      className="w-full border-0 bg-transparent block"
    />
  );
}

function PlainSideRender({
  card,
  flipped,
  fullView,
}: {
  card: AnkiStudyCard;
  flipped: boolean;
  fullView: boolean;
}) {
  const images = (flipped ? card.backImages : card.frontImages) ?? [];
  const audios = (flipped ? card.backAudios : card.frontAudios) ?? [];
  const videos = (flipped ? card.backVideos : card.frontVideos) ?? [];
  const text = flipped ? card.back : card.front;

  return (
    <>
      <div className="w-full flex flex-col items-center gap-1.5">
        {text
          ?.split("\n")
          .filter(Boolean)
          .map((line, i) => (
            <p
              key={i}
              className={cn(
                "font-bold text-foreground text-center leading-snug w-full",
                i === 0
                  ? fullView ? "text-5xl" : "text-2xl"
                  : fullView ? "text-xl text-foreground/80" : "text-base text-foreground/80"
              )}
            >
              {line}
            </p>
          )) ?? (
          <p className="text-2xl font-bold text-foreground text-center leading-snug" />
        )}
      </div>
      {images.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 max-w-full">
          {images.map((url, i) => (
            <img
              key={`img-${i}-${url}`}
              src={url}
              alt=""
              className={cn(
                "rounded-xl object-contain border border-border",
                fullView ? "max-h-64" : "max-h-20"
              )}
            />
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2 max-w-full">
          {videos.map((url, i) => (
            <video
              key={`vid-${i}-${url}`}
              src={url}
              controls
              className={cn(
                "rounded-xl border border-border",
                fullView ? "max-h-72" : "max-h-24"
              )}
            />
          ))}
        </div>
      )}
      {audios.length > 0 && (
        <div className={cn(
          "mt-1 flex flex-col items-center gap-1 w-full",
          fullView ? "max-w-md" : "max-w-xs"
        )}>
          {audios.map((url, i) => (
            <audio
              key={`aud-${i}-${url}`}
              src={url}
              controls
              className="w-full h-8"
            />
          ))}
        </div>
      )}
    </>
  );
}

/* ── State badge ── */
function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    NEW:        { label: "New",        className: "bg-blue-500/10 text-blue-600" },
    LEARNING:   { label: "Learning",   className: "bg-orange-400/10 text-orange-500" },
    REVIEW:     { label: "Review",     className: "bg-green-500/10 text-green-600" },
    RELEARNING: { label: "Relearning", className: "bg-red-500/10 text-red-500" },
  };
  const { label, className } = cfg[state] ?? cfg.NEW;
  return (
    <span className={cn("text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full", className)}>
      {label}
    </span>
  );
}
