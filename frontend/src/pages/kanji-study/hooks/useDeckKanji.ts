import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { kanjiDeckItemApi, kanjiDetailApi } from "@/api/features/kanji_study";
import type { KanjiDeckItemDTO, KanjiDetailDTO } from "@/types";

/**
 * Shared data hooks for "kanji inside a deck".
 *
 * The whole point is to AVOID the per-kanji `getById` storm that used to fire
 * one request per card (200+ at once for a big deck) — that tripped the
 * backend rate limiter (HTTP 429), which then cascaded into the deck/menu
 * requests failing and the UI collapsing. Instead we fetch the full kanji set
 * ONCE (a single page request) and cache it, then look up each deck item from
 * that map. Browse grid + the detail-page strip both reuse the same cache.
 */

const ALL_KEY = ["kanji-details-all"] as const;

// The backend clamps page size to 2000 (Spring's @PageableDefault max), so we
// page through to cover the full kanji set — otherwise the higher-id decks
// (Trung cấp / Nâng cao) fall outside a single window and render empty.
const PAGE_SIZE = 2000;
const MAX_PAGES = 5; // up to 10000 kanji

/** Every kanji detail, fetched once (paged) and cached as an id → DTO map. */
export function useAllKanjiDetails() {
  return useQuery<Map<number, KanjiDetailDTO>>({
    queryKey: ALL_KEY,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const map = new Map<number, KanjiDetailDTO>();
      const addPage = (res: any) => {
        const list = (res?.content ?? res?.items ?? []) as KanjiDetailDTO[];
        for (const k of list) if (k.id != null) map.set(k.id, k);
        return res;
      };

      const first = addPage(await kanjiDetailApi.getPage({ page: 0, size: PAGE_SIZE }));
      const totalPages = Math.min(first?.totalPages ?? 1, MAX_PAGES);

      if (totalPages > 1) {
        const rest = await Promise.all(
          Array.from({ length: totalPages - 1 }, (_, i) =>
            kanjiDetailApi.getPage({ page: i + 1, size: PAGE_SIZE })
          )
        );
        rest.forEach(addPage);
      }
      return map;
    },
  });
}

/** The deck's items (ordered), cached per deck. */
export function useDeckItems(deckId?: string | null) {
  return useQuery<KanjiDeckItemDTO[]>({
    queryKey: ["kanji-deck-items", deckId],
    enabled: !!deckId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const res = await kanjiDeckItemApi.getPage(
        { page: 0, size: 500 },
        undefined,
        { deckId: Number(deckId) } as never
      );
      const list = (res.content ?? (res as any).items ?? []) as KanjiDeckItemDTO[];
      list.sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      return list;
    },
  });
}

export interface DeckKanji {
  /** deck_item id (stable key). */
  itemId?: number;
  kanji: KanjiDetailDTO;
}

/**
 * Ordered kanji of a deck = its deck_items joined against the cached
 * all-details map. Total cost: 1 items request + 1 (shared) details request,
 * both cached — instead of one request per kanji.
 */
export function useDeckKanji(deckId?: string | null) {
  const itemsQuery = useDeckItems(deckId);
  const allQuery = useAllKanjiDetails();

  const kanji = useMemo<DeckKanji[]>(() => {
    const map = allQuery.data;
    if (!map) return [];
    const out: DeckKanji[] = [];
    for (const it of itemsQuery.data ?? []) {
      const k = it.kanjiId != null ? map.get(it.kanjiId) : undefined;
      if (k) out.push({ itemId: it.id, kanji: k });
    }
    return out;
  }, [itemsQuery.data, allQuery.data]);

  return {
    kanji,
    isLoading: itemsQuery.isLoading || allQuery.isLoading,
  };
}
