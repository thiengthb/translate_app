import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { ankiStudyApi } from "@/api";
import type { AnkiStudyCard, AnkiRating } from "@/api/features/library/ankiStudy.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { BookOpen, Brain, ChevronLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";

/* ── SM2 preview: interval each button would produce (display only) ── */
function previewDays(card: AnkiStudyCard, rating: AnkiRating): string {
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
  const [totalDue, setTotalDue] = useState(0);

  /* ── Load queue ── */
  useEffect(() => {
    if (!deckId) return;
    setLoading(true);
    ankiStudyApi
      .getQueue(Number(deckId))
      .then((data) => {
        setDeckTitle(data.deckTitle);
        setQueue(data.cards);
        setTotalNew(data.totalNew);
        setTotalDue(data.totalDue);
      })
      .catch(() => toast.error("Failed to load study queue."))
      .finally(() => setLoading(false));
  }, [deckId]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
  }, [flipped, submitting, queue]);

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

      setQueue((prev) => {
        const rest = prev.slice(1);

        if (rating === "AGAIN") {
          // Re-queue the updated card at the end of the again-queue
          setAgainQueue((aq) => [...aq, updated]);
          if (rest.length === 0) {
            // Main queue empty — pull from again-queue
            const [next, ...remaining] = [...againQueue, updated];
            setAgainQueue(remaining);
            return next ? [next] : [];
          }
          return rest;
        }

        // HARD / GOOD / EASY — card scheduled for future, remove from session
        if (rest.length === 0 && againQueue.length > 0) {
          const [next, ...remaining] = againQueue;
          setAgainQueue(remaining);
          return [next];
        }
        return rest;
      });
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const isDone = !loading && queue.length === 0 && againQueue.length === 0;
  const current = queue[0] ?? null;
  const remaining = queue.length + againQueue.length;

  return (
    <MainLayout
      pathName={{
        "/library": "Library",
        [`/deck/${deckId}/anki`]: deckTitle || "Anki Study",
      }}
    >
      <div className="max-w-3xl mx-auto w-full pb-16 space-y-6 pt-2">

        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/library")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="size-4" />
            Back to library
          </button>

          {!loading && !isDone && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500 inline-block" />
                {totalNew} new
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange-400 inline-block" />
                {totalDue} due
              </span>
            </div>
          )}
        </div>

        {/* Deck title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Brain className="size-6 text-primary" />
            {deckTitle || "Loading…"}
          </h1>
          {!loading && !isDone && (
            <p className="text-sm text-muted-foreground mt-1">
              {remaining} card{remaining !== 1 ? "s" : ""} remaining
            </p>
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
            {/* State badge */}
            <div className="flex items-center gap-2">
              <StateBadge state={current.state} />
              {current.reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  Interval: {current.intervalDays}d · Reviews: {current.reviewCount}
                </span>
              )}
            </div>

            {/* Flip card */}
            <div
              className="relative h-64 cursor-pointer select-none"
              onClick={() => !submitting && setFlipped((f) => !f)}
              style={{ perspective: 1200 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${current.flashcardId}-${flipped}`}
                  initial={{ rotateY: 90, opacity: 0 }}
                  animate={{ rotateY: 0, opacity: 1 }}
                  exit={{ rotateY: -90, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "absolute inset-0 rounded-2xl border border-border shadow-md flex flex-col items-center justify-center gap-3 px-10 py-8",
                    flipped ? "bg-primary/5" : "bg-card"
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {flipped ? "Answer" : "Question"}
                  </span>
                  <div className="w-full flex flex-col items-center gap-1.5">
                    {(flipped ? current.back : current.front)
                      ?.split("\n")
                      .filter(Boolean)
                      .map((line, i) => (
                        <p
                          key={i}
                          className={cn(
                            "font-bold text-foreground text-center leading-snug w-full",
                            i === 0 ? "text-2xl" : "text-base text-foreground/80"
                          )}
                        >
                          {line}
                        </p>
                      )) ?? (
                      <p className="text-2xl font-bold text-foreground text-center leading-snug" />
                    )}
                  </div>
                  {flipped && current.imageUrl && (
                    <img
                      src={current.imageUrl}
                      alt=""
                      className="mt-2 max-h-20 rounded-xl object-contain border border-border"
                    />
                  )}
                  {!flipped && (
                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                      Click to reveal · Space
                    </p>
                  )}
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
                        "flex flex-col items-center gap-1.5 px-6 py-3 rounded-xl border-2 text-sm font-semibold transition-colors disabled:opacity-50 min-w-[80px]",
                        className
                      )}
                    >
                      <span className="text-xs font-normal opacity-70">
                        {previewDays(current, rating)}
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
    </MainLayout>
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
