import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ankiStudyApi, flashcardApi } from "@/api";
import type { AnkiStudyCard, AnkiRating } from "@/api";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, Clock, HelpCircle, Maximize2, Minimize2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { FlashcardRenderDTO } from "@/types";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TemplateCardFace } from "../TemplateCardFace";
import { StudyMessage } from "../StudyMessage";

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

type QueueStats = { new: number; learning: number; review: number; dueToday: number; dueReview: number };

function isLearningState(card: AnkiStudyCard) {
  return card.state === "LEARNING" || card.state === "RELEARNING";
}

function returnsNowOrEarlier(nextReviewAt?: string) {
  if (!nextReviewAt) return false;
  const nextReview = new Date(nextReviewAt);
  if (Number.isNaN(nextReview.getTime())) return false;
  return nextReview <= new Date();
}

/** Absolute due timestamp (ms) of a card; cards without a schedule are due now. */
function cardDueMs(card: AnkiStudyCard, now: number): number {
  if (!card.nextReviewAt) return now;
  const t = new Date(card.nextReviewAt).getTime();
  return Number.isNaN(t) ? now : t;
}

/* ─────────────────────────────────────────
   Anki-style session queue model

   - `main`     : NEW + due REVIEW cards, studied in order.
   - `learning` : LEARNING / RELEARNING cards waiting for their nextReviewAt.
                  They re-enter the session exactly when due (not at the end).
   - `current`  : the card on screen right now.
   - `waitingUntil`: when nothing is due and `main` is empty, the timestamp of
                  the soonest learning card — drives the countdown screen so we
                  never show a learning card before its time.
───────────────────────────────────────── */
interface SrsSession {
  main: AnkiStudyCard[];
  learning: AnkiStudyCard[];
  current: AnkiStudyCard | null;
  waitingUntil: number | null;
}

const EMPTY_SESSION: SrsSession = { main: [], learning: [], current: null, waitingUntil: null };

/** Split a freshly-loaded server queue into the main and learning queues. */
function splitFromQueue(cards: AnkiStudyCard[]): { main: AnkiStudyCard[]; learning: AnkiStudyCard[] } {
  const main: AnkiStudyCard[] = [];
  const learning: AnkiStudyCard[] = [];
  for (const c of cards) (isLearningState(c) ? learning : main).push(c);
  return { main, learning };
}

/**
 * Pick the next card to show. A learning/relearning card whose nextReviewAt has
 * passed preempts the main queue (soonest-due first). Otherwise the next main
 * card. If neither is available but learning cards remain, return a wait state
 * with the soonest due time so the caller can show a countdown.
 *
 * `session.current` is assumed already detached (caller decides whether to
 * re-queue it); this only chooses a new current from `main`/`learning`.
 */
function advance(session: SrsSession, now: number): SrsSession {
  const { main, learning } = session;

  // 1) Due learning/relearning cards cut in line (most overdue first).
  let dueIdx = -1;
  let dueAt = Infinity;
  learning.forEach((c, i) => {
    const t = cardDueMs(c, now);
    if (t <= now && t < dueAt) {
      dueAt = t;
      dueIdx = i;
    }
  });
  if (dueIdx >= 0) {
    return {
      main,
      learning: learning.filter((_, i) => i !== dueIdx),
      current: learning[dueIdx],
      waitingUntil: null,
    };
  }

  // 2) Next main-queue card (NEW / due REVIEW).
  if (main.length > 0) {
    return { main: main.slice(1), learning, current: main[0], waitingUntil: null };
  }

  // 3) Nothing due now — wait for the soonest learning card, or finish.
  if (learning.length > 0) {
    const soonest = Math.min(...learning.map((c) => cardDueMs(c, now)));
    return { main, learning, current: null, waitingUntil: Number.isFinite(soonest) ? soonest : now };
  }
  return { main, learning, current: null, waitingUntil: null };
}

/**
 * Live counts derived from the session (never drift): everything still in the
 * session — the two queues plus the on-screen card — bucketed by state.
 *   New        = state NEW
 *   Learning   = state LEARNING + RELEARNING
 *   Review     = state REVIEW
 *   Due Today  = state REVIEW with nextReviewAt <= now
 */
function liveCounts(session: SrsSession): QueueStats {
  const all = [...session.main, ...session.learning, ...(session.current ? [session.current] : [])];
  const stats: QueueStats = { new: 0, learning: 0, review: 0, dueToday: 0, dueReview: 0 };
  for (const c of all) {
    if (c.state === "NEW") stats.new += 1;
    else if (isLearningState(c)) stats.learning += 1;
    else if (c.state === "REVIEW") {
      stats.review += 1;
      if (returnsNowOrEarlier(c.nextReviewAt)) {
        stats.dueToday += 1;
        stats.dueReview += 1;
      }
    }
  }
  return stats;
}

/** Cards still pending study now (drives the mode-bar badge). */
function badgeTotal(session: SrsSession): number {
  const live = liveCounts(session);
  return live.new + live.learning + live.dueReview;
}

function sessionDone(session: SrsSession): boolean {
  return !session.current && session.main.length === 0 && session.learning.length === 0;
}

/**
 * Module-level cache of the in-progress SRS session, keyed by deck. Switching
 * to another study mode unmounts SrsMode; without this, remounting would reload
 * the queue from the server and drop session-learning cards (short intervals
 * that aren't "due" yet, so the queue endpoint omits them) — making the live
 * "Learning" count vanish and the badge drop. We resume the cached session if
 * it's recent.
 */
interface CachedSrsSession {
  cachedAt: number;
  session: SrsSession;
  totalStudied: number;
  totalNew: number;
  totalLearning: number;
  totalReview: number;
  totalDue: number;
}
const srsSessionCache = new Map<number, CachedSrsSession>();
const SRS_CACHE_TTL_MS = 10 * 60 * 1000; // resume within 10 min, else reload fresh

interface SrsModeProps {
  deckId: number;
  fullView: boolean;
  onToggleFullView: () => void;
  /** Report the due-card count up to the shell so the mode bar can badge it. */
  onDueCount?: (total: number) => void;
  /** Report the current card up to the shell so its edit menu can target it. */
  onCurrentCard?: (flashcardId: number | null) => void;
}

/**
 * Spaced-repetition review (Anki SM2). This is the ONLY mode that mutates
 * scheduling — every rating posts to /anki/study/review. Learning/relearning
 * cards re-enter the session at their scheduled time (not at the end), matching
 * Anki's behaviour.
 */
export function SrsMode({ deckId, fullView, onToggleFullView, onDueCount, onCurrentCard }: SrsModeProps) {

  const [session, setSession] = useState<SrsSession>(EMPTY_SESSION);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalStudied, setTotalStudied] = useState(0);
  // Deck-level snapshot from the server (for the stats tooltip; not the live
  // numbers, which are derived from the session).
  const [totalNew, setTotalNew] = useState(0);
  const [totalLearning, setTotalLearning] = useState(0);
  const [totalReview, setTotalReview] = useState(0);
  const [totalDue, setTotalDue] = useState(0);
  const [renderData, setRenderData] = useState<FlashcardRenderDTO | null>(null);
  // Ticks while the countdown ("waiting for next learning card") screen is up.
  const [nowMs, setNowMs] = useState(() => Date.now());

  const loadQueue = (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    ankiStudyApi
      .getQueue(deckId)
      .then((data) => {
        const { main, learning } = splitFromQueue(data.cards);
        const next = advance({ main, learning, current: null, waitingUntil: null }, Date.now());
        setSession(next);
        setTotalNew(data.totalNew);
        setTotalLearning(data.totalLearning ?? 0);
        setTotalReview(data.totalReview ?? 0);
        setTotalDue(data.dueReviewCards ?? 0);
        onDueCount?.(badgeTotal(next));
      })
      .catch(() => toast.error("Failed to load study queue."))
      .finally(() => {
        if (showSpinner) setLoading(false);
      });
  };

  // On mount: resume a recent in-progress session (e.g. came back from another
  // mode) instead of reloading — otherwise session-learning cards are lost.
  useEffect(() => {
    const cached = srsSessionCache.get(deckId);
    if (cached && Date.now() - cached.cachedAt < SRS_CACHE_TTL_MS) {
      // A learning card may have become due while we were away — re-pick if we
      // were idle/waiting, otherwise keep the card that was on screen.
      const restored = cached.session.current ? cached.session : advance(cached.session, Date.now());
      setSession(restored);
      setTotalStudied(cached.totalStudied);
      setTotalNew(cached.totalNew);
      setTotalLearning(cached.totalLearning);
      setTotalReview(cached.totalReview);
      setTotalDue(cached.totalDue);
      setLoading(false);
      onDueCount?.(badgeTotal(restored));
    } else {
      loadQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // Persist the live session so it survives a mode switch (remount).
  useEffect(() => {
    if (loading) return;
    srsSessionCache.set(deckId, {
      cachedAt: Date.now(),
      session,
      totalStudied,
      totalNew,
      totalLearning,
      totalReview,
      totalDue,
    });
  }, [deckId, loading, session, totalStudied, totalNew, totalLearning, totalReview, totalDue]);

  // Countdown loop: only runs while we're waiting (no current card, but learning
  // cards still pending). Re-picks the moment the soonest one comes due, and
  // ticks `nowMs` so the countdown text updates each second.
  useEffect(() => {
    if (session.current || session.waitingUntil == null) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => {
      setSession((s) => {
        if (s.current || s.waitingUntil == null) return s;
        if (Date.now() >= s.waitingUntil) return advance(s, Date.now());
        return s;
      });
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(id);
  }, [session.current, session.waitingUntil]);

  /* Keyboard: Space flip, 1-4 rate */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      if (submitting || !session.current) return;
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
  }, [flipped, submitting, session]);

  const currentFlashcardId = session.current?.flashcardId ?? null;
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

  // Surface the current card to the shell (for its "Edit card" menu item).
  useEffect(() => {
    onCurrentCard?.(currentFlashcardId);
  }, [currentFlashcardId, onCurrentCard]);
  useEffect(() => () => onCurrentCard?.(null), [onCurrentCard]);

  const handleRate = async (rating: AnkiRating) => {
    if (submitting || !session.current) return;
    const card = session.current;
    setSubmitting(true);
    try {
      const updated = await ankiStudyApi.review({ deckId, flashcardId: card.flashcardId, rating });
      setTotalStudied((n) => n + 1);
      setFlipped(false);

      // Re-queue the just-rated card into the learning queue iff it's still in a
      // learning/relearning step (it carries the server's nextReviewAt). A card
      // that graduated to REVIEW is scheduled days out — it leaves the session.
      // Then pick the next card: a due learning card preempts the main queue.
      const learning = isLearningState(updated) ? [...session.learning, updated] : session.learning;
      const next = advance({ ...session, learning, current: null }, Date.now());
      setSession(next);
      onDueCount?.(badgeTotal(next));
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const current = session.current;
  const isDone = !loading && sessionDone(session);
  const isWaiting = !loading && !current && session.learning.length > 0;
  const live = liveCounts(session);

  if (loading) {
    return (
      <div className="flex h-full min-h-60 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      </div>
    );
  }

  if (isDone) {
    return (
      <StudyMessage
        icon={<Brain size={26} />}
        title="Session complete!"
        description={`You reviewed ${totalStudied} card${totalStudied !== 1 ? "s" : ""}. Scheduled with SM2 spaced repetition.`}
        action={{ label: "Reload queue", icon: <RotateCcw className="size-4" />, onClick: () => loadQueue() }}
      />
    );
  }

  if (isWaiting) {
    const remaining = Math.max(0, (session.waitingUntil ?? nowMs) - nowMs);
    const mm = Math.floor(remaining / 60000);
    const ss = Math.floor((remaining % 60000) / 1000);
    const learningLeft = session.learning.length;
    return (
      <StudyMessage
        icon={<Clock size={26} />}
        title="Chờ thẻ học tiếp theo"
        description={`Thẻ Learning/Relearning tiếp theo sẽ quay lại sau ${mm}:${ss
          .toString()
          .padStart(2, "0")}. Còn ${learningLeft} thẻ đang trong bước học — sẽ tự hiện đúng thời điểm.`}
      />
    );
  }

  if (!current) {
    return (
      <StudyMessage
        icon={<BookOpen size={26} />}
        title="No cards due for review"
        description="You're all caught up — check back later."
      />
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
      <div className="flex h-16 shrink-0 items-center justify-center">
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
              liveNew={live.new}
              liveLearning={live.learning}
              liveDueToday={live.dueToday}
              totalNew={totalNew}
              totalLearning={totalLearning}
              totalReview={totalReview}
              totalDue={totalDue}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function QueueStatsBar({
  liveNew,
  liveLearning,
  liveDueToday,
  totalNew,
  totalLearning,
  totalReview,
  totalDue,
}: {
  liveNew: number;
  liveLearning: number;
  liveDueToday: number;
  totalNew: number;
  totalLearning: number;
  totalReview: number;
  totalDue: number;
}) {
  return (
    <div
      className="mx-auto flex w-fit items-center gap-3 text-xs font-normal text-muted-foreground/60"
      title={`State counts: ${totalNew} new, ${totalLearning} learning, ${totalReview} review. Due now: ${totalDue}`}
    >
      <StatChip label="New" value={liveNew} />
      <span className="text-muted-foreground/25">·</span>
      <StatChip label="Learning" value={liveLearning} />
      <span className="text-muted-foreground/25">·</span>
      <StatChip label="Due Today" value={liveDueToday} />
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
