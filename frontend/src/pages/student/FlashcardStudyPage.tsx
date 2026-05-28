import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { deckApi, deckItemApi, flashcardApi } from "@/api";
import type { DeckDTO, FlashcardDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";

/** All TEXT/CLOZE blocks from a named side. Falls back to legacy single field. */
function getSideTextBlocks(fc: FlashcardDTO, side: "FRONT" | "BACK"): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const blocks = found.contents
      .filter((c) => c.contentType === "TEXT" || c.contentType === "CLOZE")
      .map((c) => c.contentValue)
      .filter(Boolean) as string[];
    if (blocks.length > 0) return blocks;
  }
  // Legacy fallback: back/front may be multi-line joined string
  const legacy = side === "FRONT" ? fc.front : fc.back;
  return legacy ? legacy.split("\n").filter(Boolean) : [""];
}

function getSideImages(fc: FlashcardDTO, side: "FRONT" | "BACK"): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const imgs = found.contents
      .filter((c) => c.contentType === "IMAGE")
      .map((c) => c.contentValue)
      .filter(Boolean) as string[];
    if (imgs.length > 0) return imgs;
  }
  return fc.imageUrl ? [fc.imageUrl] : [];
}

function getSideAudio(fc: FlashcardDTO, side: "FRONT" | "BACK"): string[] {
  const found = fc.sides?.find((s) => s.side === side);
  if (found?.contents) {
    const audios = found.contents
      .filter((c) => c.contentType === "AUDIO")
      .map((c) => c.contentValue)
      .filter(Boolean) as string[];
    if (audios.length > 0) return audios;
  }
  return fc.audioUrl ? [fc.audioUrl] : [];
}
import { BookOpen, Check, ChevronLeft, RotateCcw, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CardEntry {
  orderIndex: number;
  flashcard: FlashcardDTO;
}

/* ── Session state ── */
interface SessionState {
  remaining: CardEntry[];   // queue for this round
  wrongAccum: CardEntry[];  // wrong cards → cycle back next round
  round: number;
  roundTotal: number;       // size of remaining at the start of each round (for progress bar)
  done: boolean;
  correctTotal: number;     // cumulative correct answers
}

function buildSession(cards: CardEntry[]): SessionState {
  return {
    remaining: [...cards],
    wrongAccum: [],
    round: 1,
    roundTotal: cards.length,
    done: false,
    correctTotal: 0,
  };
}

/* ── Slide direction for card exit ── */
type SlideDir = "left" | "right" | null;

export default function FlashcardStudyPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [allCards, setAllCards] = useState<CardEntry[]>([]);
  const [session, setSession] = useState<SessionState | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [slideDir, setSlideDir] = useState<SlideDir>(null);
  const [loading, setLoading] = useState(true);

  /* ── Load deck + cards ── */
  useEffect(() => {
    if (!deckId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [deckData, itemsPage] = await Promise.all([
          deckApi.getById(deckId),
          deckItemApi.getPage({ page: 0, size: 200 }, undefined, { deckId: Number(deckId) } as any),
        ]);
        setDeck(deckData);

        const items = itemsPage.content ?? (itemsPage as any).items ?? [];
        if (items.length === 0) return;

        const flashcardIds = items.map((it: any) => it.flashcardId).filter(Boolean);
        const fcPage = await flashcardApi.getPage({ page: 0, size: 200 }, undefined, { ids: flashcardIds } as any);
        const fcList: FlashcardDTO[] = fcPage.content ?? (fcPage as any).items ?? [];

        const fcMap = new Map(fcList.map((fc) => [fc.id, fc]));
        const sorted: CardEntry[] = items
          .map((it: any) => ({ orderIndex: it.orderIndex ?? 0, flashcard: fcMap.get(it.flashcardId) }))
          .filter((e: any) => e.flashcard != null)
          .sort((a: CardEntry, b: CardEntry) => a.orderIndex - b.orderIndex);

        setAllCards(sorted);
        setSession(buildSession(sorted));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [deckId]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!session || session.done) return;
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped((f) => !f); }
      if (flipped) {
        if (e.key === "ArrowRight" || e.key === "1") markCorrect();
        if (e.key === "ArrowLeft"  || e.key === "2") markWrong();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [session, flipped]);

  /* ── Session actions ── */
  const advance = (dir: SlideDir, updater: (s: SessionState) => SessionState) => {
    setSlideDir(dir);
    setTimeout(() => {
      setSession((prev) => prev ? updater(prev) : prev);
      setFlipped(false);
      setSlideDir(null);
    }, 220);
  };

  const markCorrect = () => {
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
  };

  const markWrong = () => {
    advance("left", (prev) => {
      const [current, ...rest] = prev.remaining;
      const newWrong = [...prev.wrongAccum, current];
      if (rest.length === 0) {
        return {
          ...prev,
          remaining: newWrong,
          wrongAccum: [],
          round: prev.round + 1,
          roundTotal: newWrong.length,
        };
      }
      return { ...prev, remaining: rest, wrongAccum: newWrong };
    });
  };

  const reset = () => {
    setFlipped(false);
    setSlideDir(null);
    setSession(buildSession(allCards));
  };

  /* ── Derived ── */
  const current = session?.remaining[0]?.flashcard ?? null;
  const answered = session ? session.roundTotal - session.remaining.length : 0;
  const progress = session && session.roundTotal > 0 ? (answered / session.roundTotal) * 100 : 0;

  return (
    <MainLayout pathName={{ "/library": "Library", [`/deck/${deckId}`]: deck?.title ?? "Study" }}>
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

          {session && !session.done && (
            <button
              onClick={reset}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Deck title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {deck?.title ?? "Loading…"}
          </h1>
          {deck && (
            <p className="text-sm text-muted-foreground mt-1">
              {allCards.length} {allCards.length === 1 ? "term" : "terms"}
            </p>
          )}
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="size-6 border-2 border-border border-t-foreground rounded-full animate-spin" />
          </div>
        )}

        {/* ── Empty ── */}
        {!loading && allCards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <BookOpen className="size-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">This deck has no cards yet.</p>
          </div>
        )}

        {/* ── Done screen ── */}
        {!loading && session?.done && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center gap-6 py-16"
          >
            <div className="size-20 rounded-full bg-green-500/10 flex items-center justify-center">
              <Check className="size-10 text-green-500" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-bold text-foreground">All done!</h2>
              <p className="text-sm text-muted-foreground">
                You studied all {allCards.length} cards in {session.round} {session.round === 1 ? "round" : "rounds"}.
              </p>
            </div>
            <button
              onClick={reset}
              className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <RotateCcw className="size-4" />
              Study again
            </button>
          </motion.div>
        )}

        {/* ── Study UI ── */}
        {!loading && session && !session.done && current && (
          <>
            {/* Round + progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Round {session.round}
                  {session.round > 1 && (
                    <span className="ml-1.5 text-amber-500 font-medium">
                      · {session.remaining.length} card{session.remaining.length !== 1 ? "s" : ""} left
                    </span>
                  )}
                </span>
                <span>
                  {answered} / {session.roundTotal}
                  {session.wrongAccum.length > 0 && (
                    <span className="ml-1.5 text-destructive font-medium">
                      · {session.wrongAccum.length} to review
                    </span>
                  )}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Flip card */}
            <div
              className="relative h-64 cursor-pointer select-none"
              onClick={() => !slideDir && setFlipped((f) => !f)}
              style={{ perspective: 1200 }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${session.remaining[0]?.flashcard?.id}-${flipped}`}
                  initial={
                    slideDir
                      ? { x: slideDir === "right" ? 80 : -80, opacity: 0 }
                      : { rotateY: 90, opacity: 0 }
                  }
                  animate={{ x: 0, rotateY: 0, opacity: 1 }}
                  exit={
                    slideDir
                      ? { x: slideDir === "right" ? -80 : 80, opacity: 0 }
                      : { rotateY: -90, opacity: 0 }
                  }
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "absolute inset-0 rounded-2xl border border-border shadow-md flex flex-col items-center justify-center gap-3 px-10 py-8",
                    flipped ? "bg-primary/5" : "bg-card"
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {flipped ? "Definition" : "Term"}
                  </span>

                  {/* Text blocks */}
                  <div className="w-full flex flex-col items-center gap-1.5">
                    {getSideTextBlocks(current, flipped ? "BACK" : "FRONT").map((text, i) => (
                      <p key={i} className={cn(
                        "font-bold text-foreground text-center leading-snug w-full",
                        i === 0 ? "text-2xl" : "text-base text-foreground/80"
                      )}>
                        {text}
                      </p>
                    ))}
                  </div>

                  {/* Images */}
                  {getSideImages(current, flipped ? "BACK" : "FRONT").map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="mt-1 max-h-20 rounded-xl object-contain border border-border"
                    />
                  ))}

                  {/* Audio */}
                  {getSideAudio(current, flipped ? "BACK" : "FRONT").map((url, i) => (
                    <audio
                      key={i}
                      src={url}
                      controls
                      className="mt-1 w-full max-w-xs h-8"
                    />
                  ))}

                  {!flipped && (
                    <p className="text-[10px] text-muted-foreground/50 mt-2">
                      Click to reveal · Space
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Action buttons — visible after flip */}
            <AnimatePresence>
              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center justify-center gap-4"
                >
                  {/* Wrong */}
                  <button
                    onClick={markWrong}
                    className="flex items-center gap-2 px-8 py-3 rounded-full border-2 border-destructive text-destructive text-sm font-semibold hover:bg-destructive hover:text-white transition-colors"
                  >
                    <X className="size-4" />
                    Still learning
                  </button>

                  {/* Correct */}
                  <button
                    onClick={markCorrect}
                    className="flex items-center gap-2 px-8 py-3 rounded-full border-2 border-green-500 text-green-600 text-sm font-semibold hover:bg-green-500 hover:text-white transition-colors"
                  >
                    <Check className="size-4" />
                    Got it
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Keyboard hint */}
            {flipped && (
              <p className="text-center text-[10px] text-muted-foreground/40">
                ← Still learning &nbsp;·&nbsp; Got it →
              </p>
            )}
          </>
        )}

        {/* ── All terms list ── */}
        {!loading && allCards.length > 0 && (
          <div className="pt-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">
              Terms in this set ({allCards.length})
            </h2>
            <div className="space-y-2">
              {allCards.map(({ flashcard }, i) => (
                <div
                  key={flashcard.id ?? i}
                  className="grid grid-cols-2 gap-px rounded-xl overflow-hidden border border-border bg-border"
                >
                  {/* Front */}
                  <div className="bg-card px-5 py-4 space-y-2">
                    <div className="space-y-1">
                      {getSideTextBlocks(flashcard, "FRONT").map((text, j) => (
                        <p key={j} className={cn(
                          "text-foreground leading-snug",
                          j === 0 ? "text-sm font-semibold" : "text-xs text-foreground/70"
                        )}>
                          {text}
                        </p>
                      ))}
                    </div>
                    {getSideImages(flashcard, "FRONT").map((url, j) => (
                      <img key={j} src={url} alt="" className="max-h-16 rounded-lg object-contain border border-border" />
                    ))}
                    {getSideAudio(flashcard, "FRONT").map((url, j) => (
                      <audio key={j} src={url} controls className="w-full h-7" />
                    ))}
                  </div>

                  {/* Back */}
                  <div className="bg-card px-5 py-4 space-y-2">
                    <div className="space-y-1">
                      {getSideTextBlocks(flashcard, "BACK").map((text, j) => (
                        <p key={j} className={cn(
                          "text-foreground leading-snug",
                          j === 0 ? "text-sm font-semibold" : "text-xs text-foreground/70"
                        )}>
                          {text}
                        </p>
                      ))}
                    </div>
                    {getSideImages(flashcard, "BACK").map((url, j) => (
                      <img key={j} src={url} alt="" className="max-h-16 rounded-lg object-contain border border-border" />
                    ))}
                    {getSideAudio(flashcard, "BACK").map((url, j) => (
                      <audio key={j} src={url} controls className="w-full h-7" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
