import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Grid2x2, RotateCcw, Timer } from "lucide-react";
import { quizletStudyApi } from "@/api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { sideText } from "../cardContent";
import { shuffle } from "../quizUtils";
import type { StudyCard, StudyModeProps } from "../types";

const MAX_PAIRS = 6;

interface Tile {
  id: string;
  cardKey: number;
  kind: "term" | "def";
  text: string;
}

function buildTiles(cards: StudyCard[]): { tiles: Tile[]; pairCount: number } {
  const usable = cards
    .map((c) => ({ card: c, term: sideText(c.flashcard, "FRONT"), def: sideText(c.flashcard, "BACK") }))
    .filter((c) => c.term && c.def);
  const chosen = shuffle(usable).slice(0, MAX_PAIRS);
  const tiles: Tile[] = [];
  for (const { card, term, def } of chosen) {
    tiles.push({ id: `t-${card.deckItemId}`, cardKey: card.deckItemId, kind: "term", text: term });
    tiles.push({ id: `d-${card.deckItemId}`, cardKey: card.deckItemId, kind: "def", text: def });
  }
  return { tiles: shuffle(tiles), pairCount: chosen.length };
}

function formatElapsed(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Timed matching game: pair each term with its definition as fast as possible.
 * Pure practice — no per-card grading, but the finished session (time + pairs)
 * is logged to the Quizlet session table. Never touches SRS.
 */
export function MatchMode({ deckId, cards }: StudyModeProps) {
  const [round, setRound] = useState(0); // bump to reshuffle
  const { tiles, pairCount } = useMemo(() => buildTiles(cards), [cards, round]);

  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);
  const [wrong, setWrong] = useState<[string, string] | null>(null);
  const [startMs] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const startMsRef = useRef(startMs);
  startMsRef.current = startMs;

  // Reset transient state whenever a fresh board is built.
  useEffect(() => {
    setMatched(new Set());
    setSelected(null);
    setWrong(null);
    setFinished(false);
    setElapsed(0);
  }, [tiles]);

  // Tick the timer until finished.
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setElapsed(Date.now() - startMsRef.current), 100);
    return () => window.clearInterval(id);
  }, [finished, round]);

  const logFinish = useCallback(
    (durationMs: number) => {
      const now = new Date();
      quizletStudyApi
        .logSession({
          deckId,
          mode: "MATCH",
          totalItems: pairCount,
          completedItems: pairCount,
          startedAt: new Date(now.getTime() - durationMs).toISOString(),
          endedAt: now.toISOString(),
        })
        .catch((err) => logger.warn("Failed to log match session", err));
    },
    [deckId, pairCount]
  );

  const click = (tile: Tile) => {
    if (finished || matched.has(tile.cardKey) || wrong) return;
    if (selected === tile.id) {
      setSelected(null);
      return;
    }
    if (selected == null) {
      setSelected(tile.id);
      return;
    }
    const first = tiles.find((t) => t.id === selected)!;
    if (first.cardKey === tile.cardKey && first.kind !== tile.kind) {
      const nextMatched = new Set(matched).add(tile.cardKey);
      setMatched(nextMatched);
      setSelected(null);
      if (nextMatched.size === pairCount) {
        const final = Date.now() - startMs;
        setElapsed(final);
        setFinished(true);
        logFinish(final);
      }
    } else {
      setWrong([selected, tile.id]);
      window.setTimeout(() => {
        setWrong(null);
        setSelected(null);
      }, 550);
    }
  };

  if (pairCount < 2) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border text-center">
        <Grid2x2 className="size-9 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Need at least 2 cards with text on both sides to play Match.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Timer className="size-4" />
          <span className="font-semibold tabular-nums text-foreground">{formatElapsed(elapsed)}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{matched.size}</span>
          <span className="mx-0.5 opacity-50">/</span>
          {pairCount} pairs
        </span>
      </div>

      {finished ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="flex size-20 items-center justify-center rounded-full bg-primary/10">
            <Grid2x2 className="size-10 text-primary" />
          </div>
          <div className="space-y-1 text-center">
            <h2 className="text-2xl font-bold text-foreground">Matched in {formatElapsed(elapsed)}!</h2>
            <p className="text-sm text-muted-foreground">All {pairCount} pairs cleared.</p>
          </div>
          <button
            onClick={() => setRound((r) => r + 1)}
            className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RotateCcw className="size-4" />
            Play again
          </button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map((tile) => {
            const isMatched = matched.has(tile.cardKey);
            const isSelected = selected === tile.id;
            const isWrong = wrong?.includes(tile.id);
            return (
              <button
                key={tile.id}
                onClick={() => click(tile)}
                disabled={isMatched}
                className={cn(
                  "flex min-h-20 items-center justify-center rounded-xl border-2 p-3 text-center text-sm font-medium transition-all",
                  isMatched && "pointer-events-none scale-95 border-transparent opacity-0",
                  !isMatched && !isSelected && !isWrong && "border-border bg-background hover:border-primary/50 hover:bg-primary/5",
                  isSelected && "border-primary bg-primary/10 text-primary",
                  isWrong && "border-destructive bg-destructive/10 text-destructive"
                )}
              >
                <span className="line-clamp-4 whitespace-pre-line">{tile.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
