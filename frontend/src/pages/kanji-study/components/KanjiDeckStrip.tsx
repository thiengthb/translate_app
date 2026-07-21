import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useDeckKanji } from "../hooks/useDeckKanji";

/**
 * A horizontal strip of the kanji in the current deck, shown on the detail page
 * so the user can jump between kanji without going back to the grid.
 *
 * Instead of laying out the WHOLE deck (which is 180+ glyphs for a system deck),
 * the strip shows only the study-batch GROUP the current kanji belongs to — the
 * same "Nhóm N" batches (≈20 kanji) used on the browse page. The prev/next
 * chevrons still walk the whole deck, so reaching a group edge flips the strip
 * to the adjacent group.
 *
 * Navigation:
 * - clicking the "Nhóm N" badge opens a picker to jump to any group;
 * - ← / → move to the previous / next kanji; Space also moves to the next.
 *
 * Data comes from the shared {@link useDeckKanji} cache (one deck-items request
 * + one cached all-details request) — NOT a request per kanji.
 */

interface StripItem {
  id: number;
  character: string;
  groupIndex: number;
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
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = useMemo<StripItem[]>(
    () =>
      kanji
        .map((dk) => ({
          id: dk.kanji.id as number,
          character: dk.kanji.character ?? "",
          groupIndex: dk.groupIndex,
        }))
        .filter((s) => s.id != null && s.character),
    [kanji]
  );

  // Distinct group indexes in display order → "Nhóm n" matches the browse page.
  const groupOrder = useMemo(() => {
    const seen: number[] = [];
    for (const it of items) if (!seen.includes(it.groupIndex)) seen.push(it.groupIndex);
    return seen;
  }, [items]);

  // The groups, in order, with their items — powers the picker list.
  const groups = useMemo(() => {
    const byIndex = new Map<number, StripItem[]>();
    for (const it of items) {
      const list = byIndex.get(it.groupIndex) ?? [];
      list.push(it);
      byIndex.set(it.groupIndex, list);
    }
    return groupOrder.map((gi) => ({ groupIndex: gi, items: byIndex.get(gi) ?? [] }));
  }, [items, groupOrder]);

  const activeRef = useRef<HTMLButtonElement>(null);

  const globalIdx = items.findIndex((i) => i.id === currentId);
  const currentGroup =
    globalIdx >= 0 ? items[globalIdx].groupIndex : groupOrder[0] ?? 0;

  const groupItems = useMemo(
    () => items.filter((i) => i.groupIndex === currentGroup),
    [items, currentGroup]
  );
  const groupNumber = groupOrder.indexOf(currentGroup) + 1; // 1-based
  const idxInGroup = groupItems.findIndex((i) => i.id === currentId);

  const go = (i: number) => {
    const t = items[i];
    if (t) navigate(`/kanji-study/kanji/${t.id}?deck=${deckId}`);
  };

  // Keep the active kanji centered as the user flips through.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [currentId, groupItems.length]);

  // Keyboard: ← prev, → / Space next. Skip while typing or the picker is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pickerOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) {
        return;
      }
      if (globalIdx < 0) return;
      if (e.key === "ArrowLeft") {
        if (globalIdx > 0) {
          e.preventDefault();
          go(globalIdx - 1);
        }
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "Spacebar") {
        if (globalIdx < items.length - 1) {
          e.preventDefault();
          go(globalIdx + 1);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerOpen, globalIdx, items, deckId]);

  if (items.length === 0) return null;

  return (
    <div className="sticky top-14 z-10 -mx-3 sm:-mx-4 lg:-mx-6 mb-4 px-3 sm:px-4 lg:px-6 py-2 bg-background/90 backdrop-blur border-b border-border/60">
      <div className="flex items-center gap-2">
        <button
          onClick={() => go(globalIdx - 1)}
          disabled={globalIdx <= 0}
          title="Hán tự trước (←)"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={18} />
        </button>

        {groupOrder.length > 1 && (
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                title="Chọn nhóm"
                className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-foreground rounded-md bg-muted px-2 py-1 hover:bg-muted/70 transition-colors"
              >
                Nhóm {groupNumber}
                <ChevronDown size={13} className="opacity-70" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 p-1.5 max-h-72 overflow-y-auto">
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Chọn nhóm ({groupOrder.length})
              </p>
              {groups.map((g, i) => {
                const active = g.groupIndex === currentGroup;
                return (
                  <button
                    key={g.groupIndex}
                    onClick={() => {
                      setPickerOpen(false);
                      const first = g.items[0];
                      if (first) navigate(`/kanji-study/kanji/${first.id}?deck=${deckId}`);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                      active ? "bg-rose-500 text-white" : "hover:bg-muted"
                    )}
                  >
                    <span className="font-semibold shrink-0">Nhóm {i + 1}</span>
                    <span
                      className={cn(
                        "font-serif truncate",
                        active ? "text-white/90" : "text-muted-foreground"
                      )}
                    >
                      {g.items.slice(0, 6).map((it) => it.character).join(" ")}
                    </span>
                    <span
                      className={cn(
                        "ml-auto shrink-0 text-xs tabular-nums",
                        active ? "text-white/80" : "text-muted-foreground"
                      )}
                    >
                      {g.items.length}
                    </span>
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}

        <div className="flex gap-1.5 overflow-x-auto py-1 flex-1">
          {groupItems.map((it) => {
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
          {idxInGroup >= 0 ? idxInGroup + 1 : "–"}/{groupItems.length}
        </span>
        <button
          onClick={() => go(globalIdx + 1)}
          disabled={globalIdx < 0 || globalIdx >= items.length - 1}
          title="Hán tự sau (→ hoặc Space)"
          className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
