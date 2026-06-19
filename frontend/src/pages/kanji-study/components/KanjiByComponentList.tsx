import { useCallback, useEffect, useState } from "react";
import { kanjiComponentApi } from "@/api/features/kanji_study";
import type { KanjiDetailDTO } from "@/types";
import { logger } from "@/lib/logger";

/**
 * Paginated list of kanji that contain a given chiết-tự component (matched
 * against the KanjiVG tree on the backend). Shared by the component popup on
 * the kanji detail page and by the radical detail page.
 *
 * Mirrors the mobile Kanji Study layout: character | reading chips + meaning,
 * easiest JLPT level first.
 */

const PAGE_SIZE = 24;

function splitReadings(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[、,，;；/\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function KanjiByComponentList({
  component,
  onSelect,
  totalLabel = true,
}: {
  component: string;
  onSelect: (kanji: KanjiDetailDTO) => void;
  /** Show the "N Hán tự" count header. */
  totalLabel?: boolean;
}) {
  const [items, setItems] = useState<KanjiDetailDTO[]>([]);
  const [page, setPage] = useState(0);
  const [totalElements, setTotalElements] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadPage = useCallback(
    async (p: number) => {
      setIsLoading(true);
      try {
        const res = await kanjiComponentApi.kanjiByComponent(component, p, PAGE_SIZE);
        const list = (res.content ?? res.items ?? []) as KanjiDetailDTO[];
        setItems((prev) => (p === 0 ? list : [...prev, ...list]));
        setPage(p);
        setTotalElements(res.totalElements ?? list.length);
        setTotalPages(res.totalPages ?? 0);
      } catch (e) {
        logger.error("kanjiByComponent failed", e);
        if (p === 0) {
          setItems([]);
          setTotalElements(0);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [component]
  );

  useEffect(() => {
    setItems([]);
    setTotalElements(null);
    void loadPage(0);
  }, [loadPage]);

  const hasMore = page + 1 < totalPages;

  return (
    <div>
      {totalLabel && totalElements != null && (
        <p className="text-sm text-muted-foreground mb-3">
          {totalElements} Hán tự chứa 「{component}」
        </p>
      )}

      {isLoading && items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Đang tải...</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Không tìm thấy Hán tự nào chứa 「{component}」.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((k) => {
            const on = splitReadings(k.onyomi).slice(0, 2);
            const kun = splitReadings(k.kunyomi).slice(0, 2);
            return (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => onSelect(k)}
                  className="w-full flex items-center gap-4 py-3 px-2 text-left hover:bg-muted/60 rounded-lg transition-colors"
                >
                  <span className="relative shrink-0">
                    <span className="text-4xl font-serif text-rose-600 dark:text-rose-400 leading-none">
                      {k.character}
                    </span>
                    {k.jlptLevel && k.jlptLevel !== "KHAC" && (
                      <span className="absolute -top-1.5 -left-3 text-[10px] font-semibold text-muted-foreground">
                        {k.jlptLevel}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    {(on.length > 0 || kun.length > 0) && (
                      <span className="flex flex-wrap gap-1.5 mb-1">
                        {on.map((r) => (
                          <span
                            key={`on-${r}`}
                            className="px-1.5 py-0.5 rounded-md text-xs bg-teal-600/15 text-teal-700 dark:text-teal-300"
                          >
                            {r}
                          </span>
                        ))}
                        {kun.map((r) => (
                          <span
                            key={`kun-${r}`}
                            className="px-1.5 py-0.5 rounded-md text-xs bg-sky-600/15 text-sky-700 dark:text-sky-300"
                          >
                            {r}
                          </span>
                        ))}
                      </span>
                    )}
                    {k.meaning && (
                      <span className="block text-sm font-medium text-foreground truncate">{k.meaning}</span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <div className="flex justify-center pt-3">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void loadPage(page + 1)}
            className="px-4 py-1.5 rounded-lg text-sm border border-border text-foreground hover:border-rose-400 hover:text-rose-600 disabled:opacity-50 transition-colors"
          >
            {isLoading ? "Đang tải..." : "Tải thêm"}
          </button>
        </div>
      )}
    </div>
  );
}
