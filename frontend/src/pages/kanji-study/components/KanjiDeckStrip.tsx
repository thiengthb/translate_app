import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDeckKanji } from "../hooks/useDeckKanji";

/**
 * A horizontal strip of every kanji in the current deck, shown on the detail
 * page so the user can jump between kanji without going back to the grid.
 *
 * Data comes from the shared {@link useDeckKanji} cache (one deck-items request
 * + one cached all-details request) — NOT a request per kanji — so flipping
 * through cards is free and never trips the rate limiter. The active kanji is
 * highlighted and auto-scrolled into view.
 */

interface StripItem {
  id: number;
  character: string;
}

export function KanjiDeckStrip({
  deckId,
  currentId,
}: {
  deckId: string;
  currentId?: number;
}) {
  const navigate = useNavigate();
  const { kanji } = useDeckKanji(deckId);
  const items = useMemo<StripItem[]>(
    () =>
      kanji
        .map((dk) => ({ id: dk.kanji.id as number, character: dk.kanji.character ?? "" }))
        .filter((s) => s.id != null && s.character),
    [kanji]
  );
  const activeRef = useRef<HTMLButtonElement>(null);

  const idx = items.findIndex((i) => i.id === currentId);

  // Keep the active kanji centered as the user flips through.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentId, items.length]);

  if (items.length === 0) return null;

  const go = (i: number) => {
    const t = items[i];
    if (t) navigate(`/kanji-study/kanji/${t.id}?deck=${deckId}`);
  };

  return (
    <div className="sticky top-14 z-10 -mx-3 sm:-mx-4 lg:-mx-6 mb-4 px-3 sm:px-4 lg:px-6 py-2 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(idx - 1)}
          disabled={idx <= 0}
          title="Hán tự trước"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        <div className="flex gap-1.5 overflow-x-auto py-1 flex-1">
          {items.map((it) => {
            const active = it.id === currentId;
            return (
              <button
                ref={active ? activeRef : undefined}
                key={it.id}
                onClick={() => navigate(`/kanji-study/kanji/${it.id}?deck=${deckId}`)}
                title={it.character}
                className={cn(
                  "shrink-0 h-9 w-9 grid place-items-center rounded-lg font-serif text-lg border transition-colors",
                  active
                    ? "bg-rose-500 text-white border-rose-500 shadow-sm"
                    : "bg-card text-foreground border-border hover:border-rose-400"
                )}
              >
                {it.character}
              </button>
            );
          })}
        </div>

        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {idx >= 0 ? idx + 1 : "–"}/{items.length}
        </span>
        <button
          onClick={() => go(idx + 1)}
          disabled={idx < 0 || idx >= items.length - 1}
          title="Hán tự sau"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
