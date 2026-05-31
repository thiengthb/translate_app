import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  RotateCcw,
  Shuffle,
  X,
} from "lucide-react";
import { quizletStudyApi } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RevealMore } from "@/components/common/RevealMore";
import { CardFace } from "../CardFace";
import { getSideTextBlocks } from "../cardContent";
import type { StudyCard, StudyModeProps } from "../types";

const TERMS_INITIAL_VISIBLE = 30;

interface SessionState {
  remaining: StudyCard[];
  wrongAccum: StudyCard[];
  round: number;
  roundTotal: number;
  done: boolean;
  correctTotal: number;
}

type SlideDir = "left" | "right" | null;

function shuffleCards(cards: StudyCard[]): StudyCard[] {
  const out = [...cards];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function buildSession(cards: StudyCard[]): SessionState {
  return { remaining: [...cards], wrongAccum: [], round: 1, roundTotal: cards.length, done: false, correctTotal: 0 };
}

/**
 * Quizlet-style flip flow with a "track progress" toggle:
 *
 *   - Track ON  → reveal then mark "got it" / "still learning"; wrong cards
 *     cycle into the next round and every mark is reported to the Quizlet
 *     progress tables (never SRS).
 *   - Track OFF → plain browsing with prev/next arrows and a position counter;
 *     nothing is recorded.
 */
export function FlashcardMode({ deckId, cards, fullView, onToggleFullView }: StudyModeProps) {
  const [order, setOrder] = useState<StudyCard[]>(cards);
  const [session, setSession] = useState<SessionState>(() => buildSession(cards));
  const [index, setIndex] = useState(0); // browse position (track OFF)
  const [trackProgress, setTrackProgress] = useState(true);
  const [flipped, setFlipped] = useState(false);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  const [shuffled, setShuffled] = useState(false);
  const [visibleTerms, setVisibleTerms] = useState(TERMS_INITIAL_VISIBLE);

  // Rebuild when the deck's cards change (e.g. first load completes).
  useEffect(() => {
    setOrder(cards);
    setSession(buildSession(cards));
    setIndex(0);
    setShuffled(false);
    setFlipped(false);
  }, [cards]);

  const current = trackProgress ? session.remaining[0] ?? null : order[index] ?? null;

  const record = useCallback(
    (card: StudyCard, correct: boolean) => {
      if (card.flashcard.id == null) return;
      quizletStudyApi
        .answer({ deckId, flashcardId: card.flashcard.id, mode: "FLASHCARD", correct })
        .catch((err) => logger.warn("Failed to record flashcard answer", err));
    },
    [deckId]
  );

  const advance = useCallback((dir: SlideDir, updater: (s: SessionState) => SessionState) => {
    setSlideDir(dir);
    setTimeout(() => {
      setSession((prev) => updater(prev));
      setFlipped(false);
      setSlideDir(null);
    }, 220);
  }, []);

  const markCorrect = useCallback(() => {
    if (!current) return;
    record(current, true);
    advance("right", (prev) => {
      const [, ...rest] = prev.remaining;
      if (rest.length === 0 && prev.wrongAccum.length === 0) {
        return { ...prev, remaining: [], done: true, correctTotal: prev.correctTotal + 1 };
      }
      if (rest.length === 0) {
        return {
          ...prev,
          remaining: prev.wrongAccum,
          wrongAccum: [],
          round: prev.round + 1,
          roundTotal: prev.wrongAccum.length,
          correctTotal: prev.correctTotal + 1,
        };
      }
      return { ...prev, remaining: rest, correctTotal: prev.correctTotal + 1 };
    });
  }, [current, record, advance]);

  const markWrong = useCallback(() => {
    if (!current) return;
    record(current, false);
    advance("left", (prev) => {
      const [head, ...rest] = prev.remaining;
      const newWrong = [...prev.wrongAccum, head];
      if (rest.length === 0) {
        return { ...prev, remaining: newWrong, wrongAccum: [], round: prev.round + 1, roundTotal: newWrong.length };
      }
      return { ...prev, remaining: rest, wrongAccum: newWrong };
    });
  }, [current, record, advance]);

  // Browse navigation (track OFF): step through `order` with a slide.
  const browseGo = useCallback(
    (delta: -1 | 1) => {
      setSlideDir(delta > 0 ? "right" : "left");
      setTimeout(() => {
        setIndex((i) => Math.min(order.length - 1, Math.max(0, i + delta)));
        setFlipped(false);
        setSlideDir(null);
      }, 220);
    },
    [order.length]
  );

  const reset = useCallback(() => {
    setFlipped(false);
    setSlideDir(null);
    setShuffled(false);
    setOrder(cards);
    setSession(buildSession(cards));
    setIndex(0);
  }, [cards]);

  const toggleShuffle = useCallback(() => {
    setFlipped(false);
    setSlideDir(null);
    const next = !shuffled;
    const nextOrder = next ? shuffleCards(cards) : cards;
    setShuffled(next);
    setOrder(nextOrder);
    setSession(buildSession(nextOrder));
    setIndex(0);
  }, [shuffled, cards]);

  const handleTrackChange = useCallback(
    (on: boolean) => {
      setTrackProgress(on);
      setFlipped(false);
      setSlideDir(null);
      setIndex(0);
      setSession(buildSession(order));
    },
    [order]
  );

  /* Keyboard: Space/Enter flip. Track: →/1 correct, ←/2 wrong. Browse: ←/→ nav. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!current || (trackProgress && session.done)) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
        return;
      }
      if (trackProgress) {
        if (flipped && (e.key === "ArrowRight" || e.key === "1")) markCorrect();
        if (flipped && (e.key === "ArrowLeft" || e.key === "2")) markWrong();
      } else {
        if (e.key === "ArrowRight") browseGo(1);
        if (e.key === "ArrowLeft") browseGo(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [trackProgress, session.done, current, flipped, markCorrect, markWrong, browseGo]);

  // Progress bar fill: mastery within the round (track) or position (browse).
  const progress = trackProgress
    ? session.roundTotal > 0
      ? ((session.roundTotal - session.remaining.length) / session.roundTotal) * 100
      : 0
    : order.length > 0
      ? ((index + 1) / order.length) * 100
      : 0;

  if (trackProgress && session.done) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-6 py-16"
      >
        <div className="flex size-20 items-center justify-center rounded-full bg-green-500/10">
          <Check className="size-10 text-green-500" />
        </div>
        <div className="space-y-1 text-center">
          <h2 className="text-2xl font-bold text-foreground">All done!</h2>
          <p className="text-sm text-muted-foreground">
            You studied all {cards.length} cards in {session.round} {session.round === 1 ? "round" : "rounds"}.
          </p>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <RotateCcw className="size-4" />
          Study again
        </button>
      </motion.div>
    );
  }

  if (!current) return null;
  const cardKey = trackProgress ? `t-${current.flashcard.id}-${flipped}` : `b-${index}-${flipped}`;

  return (
    <div>
      <div className="space-y-6">
      {/* Progress bar (no labels) */}
      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
        <motion.div className="h-full rounded-full bg-primary" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
      </div>

      {/* Flip card */}
      <div
        className={cn("relative cursor-pointer select-none", fullView ? "h-[65vh]" : "h-64")}
        onClick={() => !slideDir && setFlipped((f) => !f)}
        style={{ perspective: 800 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={cardKey}
            initial={slideDir ? { x: slideDir === "right" ? 80 : -80, opacity: 0 } : { rotateX: 90, opacity: 0 }}
            animate={{ x: 0, rotateX: 0, opacity: 1 }}
            exit={slideDir ? { x: slideDir === "right" ? -80 : 80, opacity: 0 } : { rotateX: -90, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-3 overflow-y-auto rounded-2xl border border-border px-10 py-8 shadow-md",
              flipped ? "bg-primary/5" : "bg-card"
            )}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {flipped ? "Definition" : "Term"}
            </span>
            <CardFace flashcard={current.flashcard} side={flipped ? "BACK" : "FRONT"} large={fullView} />
            {!flipped && <p className="mt-2 text-[10px] text-muted-foreground/50">Click to reveal · Space</p>}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action row — toggle (left) · main controls (center) · utilities (right) */}
      <div className="relative flex min-h-12 items-center justify-center">
        {/* Track-progress switch */}
        <label
          className="absolute left-0 flex h-9 cursor-pointer select-none items-center gap-2"
          title={trackProgress ? "Đang theo dõi tiến độ — tắt để chỉ duyệt thẻ" : "Bật theo dõi tiến độ"}
        >
          <Switch checked={trackProgress} onCheckedChange={handleTrackChange} aria-label="Theo dõi tiến độ" />
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">Tiến độ</span>
        </label>

        {/* Center controls */}
        {trackProgress ? (
          <AnimatePresence>
            {flipped && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center gap-2"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={markWrong}
                      className="flex h-9 items-center gap-1.5 rounded-full border border-destructive px-4 text-xs font-semibold text-destructive transition-colors hover:bg-destructive hover:text-white"
                    >
                      <X className="size-3.5" />
                      Học lại
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Học lại (←)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={markCorrect}
                      className="flex h-9 items-center gap-1.5 rounded-full border border-green-500 px-4 text-xs font-semibold text-green-600 transition-colors hover:bg-green-500 hover:text-white"
                    >
                      <Check className="size-3.5" />
                      Nhớ rồi
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Nhớ rồi (→)</TooltipContent>
                </Tooltip>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => browseGo(-1)}
              disabled={index === 0}
              title="Thẻ trước (←)"
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="min-w-14 text-center text-sm font-semibold tabular-nums text-foreground">
              {index + 1}
              <span className="mx-0.5 font-normal text-muted-foreground">/</span>
              {order.length}
            </span>
            <button
              onClick={() => browseGo(1)}
              disabled={index >= order.length - 1}
              title="Thẻ sau (→)"
              className="flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}

        {/* Utilities */}
        <div className="absolute right-0 flex items-center gap-1">
          {cards.length > 1 && (
            <CardActionButton
              onClick={toggleShuffle}
              active={shuffled}
              title={shuffled ? "Shuffling — click to restore order" : "Shuffle cards"}
            >
              <Shuffle className="size-4" />
            </CardActionButton>
          )}
          <CardActionButton onClick={reset} title="Reset to original order">
            <RotateCcw className="size-4" />
          </CardActionButton>
          <CardActionButton onClick={onToggleFullView} title={fullView ? "Exit full view (Esc)" : "Full view"}>
            {fullView ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </CardActionButton>
        </div>
      </div>
      </div>

      {/* All terms list — kept close to the study area above */}
      {!fullView && (
        <div className="mt-4 space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Terms in this set ({cards.length})</h2>
          <div className="space-y-2">
            {cards.slice(0, visibleTerms).map(({ flashcard }, i) => (
              <div
                key={flashcard.id ?? i}
                className="grid grid-cols-[32px_1fr_1fr] gap-px overflow-hidden rounded-xl border border-border bg-border"
              >
                <div className="flex select-none items-center justify-center bg-muted/50 text-xs font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="bg-card px-5 py-4">
                  {getSideTextBlocks(flashcard, "FRONT").map((t, j) => (
                    <p key={j} className={cn("leading-snug text-foreground", j === 0 ? "text-sm font-semibold" : "text-xs text-foreground/70")}>
                      {t}
                    </p>
                  ))}
                </div>
                <div className="bg-card px-5 py-4">
                  {getSideTextBlocks(flashcard, "BACK").map((t, j) => (
                    <p key={j} className={cn("leading-snug text-foreground", j === 0 ? "text-sm font-semibold" : "text-xs text-foreground/70")}>
                      {t}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <RevealMore total={cards.length} visibleCount={visibleTerms} onChange={setVisibleTerms} initialCount={TERMS_INITIAL_VISIBLE} />
        </div>
      )}
    </div>
  );
}

/** Compact translucent button for the action row's utility cluster. */
function CardActionButton({
  onClick,
  active = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
