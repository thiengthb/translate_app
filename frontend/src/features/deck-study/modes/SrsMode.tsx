import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ankiStudyApi, flashcardApi } from "@/api";
import type { AnkiStudyCard, AnkiRating } from "@/api";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Brush, HelpCircle, Maximize2, Minimize2, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { FlashcardRenderDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TemplateCardFace } from "../TemplateCardFace";

/** Keyboard shortcuts shown in the card's help tooltip. */
const SHORTCUTS: { keys: string; desc: string }[] = [
  { keys: "Space", desc: "Lật thẻ / hiện đáp án" },
  { keys: "1", desc: "Again" },
  { keys: "2", desc: "Hard" },
  { keys: "3", desc: "Good" },
  { keys: "4", desc: "Easy" },
  { keys: "Esc", desc: "Thoát toàn màn hình" },
];

/* ── SM2 preview fallback (display only) ── */
function fallbackPreview(card: AnkiStudyCard, rating: AnkiRating): string {
  if (rating === "AGAIN") return "< 1m";
  const quality = rating === "HARD" ? 3 : rating === "EASY" ? 5 : 4;
  const rep = card.reviewCount;
  const ef = card.easeFactor;
  const iv = card.intervalDays;
  let next: number;
  if (rep === 0) next = quality === 5 ? 4 : 1;
  else if (rep === 1) next = quality === 5 ? 10 : 6;
  else {
    const base = Math.round(iv * ef);
    next = quality === 3 ? Math.max(1, Math.round(base * 0.8)) : quality === 5 ? Math.round(base * 1.3) : base;
  }
  if (next <= 0) return "< 1d";
  if (next === 1) return "1d";
  if (next < 30) return `${next}d`;
  return `${Math.round(next / 30)}mo`;
}

function ratingPreview(card: AnkiStudyCard, rating: AnkiRating): string {
  const preview = { AGAIN: card.againPreview, HARD: card.hardPreview, GOOD: card.goodPreview, EASY: card.easyPreview }[rating];
  return preview ?? fallbackPreview(card, rating);
}

const RATING_CONFIG: { rating: AnkiRating; label: string; shortcut: string }[] = [
  { rating: "AGAIN", label: "Again", shortcut: "1" },
  { rating: "HARD", label: "Hard", shortcut: "2" },
  { rating: "GOOD", label: "Good", shortcut: "3" },
  { rating: "EASY", label: "Easy", shortcut: "4" },
];

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

interface SrsModeProps {
  deckId: number;
  fullView: boolean;
  onToggleFullView: () => void;
  /** Report the due-card count up to the shell so the mode bar can badge it. */
  onDueCount?: (total: number) => void;
}

/**
 * Spaced-repetition review (Anki SM2). This is the ONLY mode that mutates
 * scheduling — every rating posts to /anki/study/review. Ported verbatim from
 * the former AnkiStudyPage; the unified shell now provides the layout + full
 * view, so this renders just the study surface.
 */
export function SrsMode({ deckId, fullView, onToggleFullView, onDueCount }: SrsModeProps) {
  const navigate = useNavigate();

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
  const [renderData, setRenderData] = useState<FlashcardRenderDTO | null>(null);

  const loadQueue = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    ankiStudyApi
      .getQueue(deckId)
      .then((data) => {
        setQueue(data.cards);
        setAgainQueue([]);
        setSessionStats(countMainQueueStats(data.cards));
        setTotalNew(data.totalNew);
        setTotalLearning(data.totalLearning ?? 0);
        setTotalReview(data.totalReview ?? data.totalDue);
        setTotalDue(data.totalDue);
        onDueCount?.(data.totalDue + data.totalNew);
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

  /* Keyboard: Space flip, 1-4 rate */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flipped, submitting, queue]);

  const currentFlashcardId = queue[0]?.flashcardId ?? null;
  useEffect(() => {
    if (currentFlashcardId == null) {
      setRenderData(null);
      return;
    }
    let cancelled = false;
    flashcardApi
      .getRender(currentFlashcardId)
      .then((data) => !cancelled && setRenderData(data))
      .catch(() => !cancelled && setRenderData(null));
    return () => {
      cancelled = true;
    };
  }, [currentFlashcardId]);

  const handleRate = async (rating: AnkiRating) => {
    if (submitting || queue.length === 0) return;
    const card = queue[0];
    setSubmitting(true);
    try {
      const updated = await ankiStudyApi.review({ deckId, flashcardId: card.flashcardId, rating });
      setTotalStudied((n) => n + 1);
      setFlipped(false);

      const rest = queue.slice(1);
      const shouldRequeue = shouldTrackAsSessionLearning(updated);
      let nextAgainQueue = shouldRequeue ? [...againQueue, updated] : [...againQueue];
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
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDone = !loading && queue.length === 0 && againQueue.length === 0;
  const current = queue[0] ?? null;

  if (loading) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (isDone) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Brain size={26} />
          </div>
          <div className="max-w-md text-center">
            <p className="font-medium text-foreground">Session complete!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You reviewed {totalStudied} card{totalStudied !== 1 ? "s" : ""}. Scheduled with SM2 spaced repetition.
            </p>
          </div>
          <Button size="sm" onClick={() => loadQueue()}>
            <RotateCcw className="size-4" />
            Reload queue
          </Button>
        </div>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center">
        <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-muted-foreground">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BookOpen size={26} />
          </div>
          <div className="max-w-md text-center">
            <p className="font-medium text-foreground">No cards due for review</p>
            <p className="mt-1 text-sm text-muted-foreground">You're all caught up — check back later.</p>
          </div>
        </div>
      </div>
    );
  }

  // In full view the card chrome (border / background) is dropped so the
  // content reaches the screen edges: title snug at the top, controls at the
  // bottom, content filling the space between.
  const chromeless = fullView;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Card surface — grows to fill the available height */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden",
          !chromeless && "rounded-2xl border border-border bg-card shadow-sm"
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-between gap-2 px-3 py-2",
            !chromeless && "border-b border-border/60"
          )}
        >
          <div className="flex items-center gap-2">
            <StateBadge state={current.state} />
            {current.reviewCount > 0 && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                Interval {current.intervalDays}d · {current.reviewCount} review{current.reviewCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {flipped ? "Answer" : "Question"}
          </span>
          <div className="flex shrink-0 items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Phím tắt"
                  className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <HelpCircle className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="w-52">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">Phím tắt</p>
                <div className="space-y-1">
                  {SHORTCUTS.map((s) => (
                    <div key={s.keys} className="flex items-center justify-between gap-4">
                      <span>{s.desc}</span>
                      <kbd className="rounded bg-background/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
                        {s.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
            <button
              onClick={onToggleFullView}
              title={fullView ? "Exit full view (Esc)" : "Full view"}
              aria-label={fullView ? "Exit full view" : "Full view"}
              className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {fullView ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
        </div>

        <div
          className="relative flex min-h-0 flex-1 cursor-pointer select-none items-center justify-center overflow-y-auto px-4"
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
              className="w-full"
            >
              <div className="flex flex-col py-4">
                {hasTemplateRender(renderData, flipped) ? (
                  <TemplateCardFace
                    html={flipped ? renderData!.backHtml : renderData!.frontHtml}
                    styling={renderData!.styling}
                    large={fullView}
                    onFlip={() => !submitting && setFlipped((f) => !f)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-3 px-6 py-4">
                    <PlainSideRender card={current} flipped={flipped} fullView={fullView} />
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls — question: New/Learning/Review; answer: Again/Hard/Good/Easy.
          Fixed height (== rating buttons + the time labels above them) so the
          card above keeps a constant size when flipping between the two. */}
      <div className="flex h-16 shrink-0 items-center gap-2">
        <div className="flex-1" />
        <div className="flex items-center justify-center gap-2 sm:gap-3">
          {flipped ? (
            RATING_CONFIG.map(({ rating, label, shortcut }) => (
              <div key={rating} className="flex flex-col items-center gap-1">
                <span className="text-[11px] font-medium tabular-nums text-muted-foreground">
                  {ratingPreview(current, rating)}
                </span>
                <button
                  onClick={() => handleRate(rating)}
                  disabled={submitting}
                  title={`${label} (${shortcut})`}
                  className="flex h-9 items-center justify-center rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
                >
                  {label}
                </button>
              </div>
            ))
          ) : (
            <QueueStatsBar
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
        <div className="flex flex-1 items-center justify-end gap-1.5">
          <ChromeButton
            icon={Pencil}
            label="Edit card"
            onClick={() => navigate(`/deck/${deckId}/card/${current.flashcardId}/edit`)}
            title="Edit this card"
          />
          <ChromeButton
            icon={Brush}
            label="Template"
            onClick={() => navigate(`/deck/${deckId}/anki/template`)}
            title="Edit template (affects all cards using this template)"
          />
        </div>
      </div>
    </div>
  );
}

/* ── Toolbar chrome button ── */
function ChromeButton({
  icon: Icon,
  label,
  onClick,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title ?? label}
      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function QueueStatsBar({
  liveNew,
  liveLearning,
  liveReview,
  totalNew,
  totalLearning,
  totalReview,
  totalDue,
}: {
  liveNew: number;
  liveLearning: number;
  liveReview: number;
  totalNew: number;
  totalLearning: number;
  totalReview: number;
  totalDue: number;
}) {
  return (
    <div
      className="mx-auto flex w-fit items-center gap-3 text-xs font-normal text-muted-foreground/60"
      title={`Available today: ${totalNew} new, ${totalLearning} learning, ${totalReview} to review, ${totalDue} due total`}
    >
      <StatChip label="New" value={liveNew} />
      <span className="text-muted-foreground/25">·</span>
      <StatChip label="Learning" value={liveLearning} />
      <span className="text-muted-foreground/25">·</span>
      <StatChip label="Review" value={liveReview} />
    </div>
  );
}

/** Quiet, low-emphasis stat: just a label + a light number, no dot, no colour. */
function StatChip({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5">
      <span>{label}</span>
      <span className="font-normal tabular-nums text-muted-foreground">{value}</span>
    </span>
  );
}

function hasTemplateRender(render: FlashcardRenderDTO | null, flipped: boolean): boolean {
  if (!render) return false;
  const html = flipped ? render.backHtml : render.frontHtml;
  return typeof html === "string" && html.trim().length > 0;
}

function PlainSideRender({ card, flipped, fullView }: { card: AnkiStudyCard; flipped: boolean; fullView: boolean }) {
  const images = (flipped ? card.backImages : card.frontImages) ?? [];
  const audios = (flipped ? card.backAudios : card.frontAudios) ?? [];
  const videos = (flipped ? card.backVideos : card.frontVideos) ?? [];
  const text = flipped ? card.back : card.front;

  return (
    <>
      <div className="flex w-full flex-col items-center gap-1.5">
        {text
          ?.split("\n")
          .filter(Boolean)
          .map((line, i) => (
            <p
              key={i}
              className={cn(
                "w-full text-center font-bold leading-snug text-foreground",
                i === 0 ? (fullView ? "text-5xl" : "text-2xl") : fullView ? "text-xl text-foreground/80" : "text-base text-foreground/80"
              )}
            >
              {line}
            </p>
          )) ?? <p className="text-center text-2xl font-bold leading-snug text-foreground" />}
      </div>
      {images.length > 0 && (
        <div className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-2">
          {images.map((url, i) => (
            <img key={`img-${i}`} src={url} alt="" className={cn("rounded-xl border border-border object-contain", fullView ? "max-h-64" : "max-h-20")} />
          ))}
        </div>
      )}
      {videos.length > 0 && (
        <div className="mt-2 flex max-w-full flex-wrap items-center justify-center gap-2">
          {videos.map((url, i) => (
            <video key={`vid-${i}`} src={url} controls className={cn("rounded-xl border border-border", fullView ? "max-h-72" : "max-h-24")} />
          ))}
        </div>
      )}
      {audios.length > 0 && (
        <div className={cn("mt-1 flex w-full flex-col items-center gap-1", fullView ? "max-w-md" : "max-w-xs")}>
          {audios.map((url, i) => (
            <audio key={`aud-${i}`} src={url} controls className="h-8 w-full" />
          ))}
        </div>
      )}
    </>
  );
}

function StateBadge({ state }: { state: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    NEW: { label: "New", className: "bg-blue-500/10 text-blue-600" },
    LEARNING: { label: "Learning", className: "bg-orange-400/10 text-orange-500" },
    REVIEW: { label: "Review", className: "bg-green-500/10 text-green-600" },
    RELEARNING: { label: "Relearning", className: "bg-red-500/10 text-red-500" },
  };
  const { label, className } = cfg[state] ?? cfg.NEW;
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest", className)}>{label}</span>;
}
