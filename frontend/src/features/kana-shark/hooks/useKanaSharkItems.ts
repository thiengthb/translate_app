import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ankiStudyApi, deckApi } from "@/api";
import type { DeckDTO } from "@/types";
import { getCurrentUserId } from "@/utils/auth.utils";
import type { KanaSharkMode, SrsItem } from "../types/kanaShark.types";
import { createSrsItemFromCard } from "../utils/createEnemyFromSrsItem";

export function useKanaSharkDecks() {
  return useQuery({
    queryKey: ["kana-shark", "decks"],
    queryFn: async (): Promise<DeckDTO[]> => {
      const userId = getCurrentUserId();
      const response = await deckApi.getPage(
        { page: 0, size: 100 },
        undefined,
        userId == null ? undefined : ({ userId } as never),
      );
      return response.content ?? [];
    },
    staleTime: 60_000,
  });
}

export function useKanaSharkItems(deckId: number | null, mode: KanaSharkMode, maxItems: number) {
  const query = useQuery({
    queryKey: ["kana-shark", "items", deckId, mode, maxItems],
    enabled: deckId != null,
    queryFn: async () => {
      if (deckId == null) return [];
      const queue = await ankiStudyApi.getQueue(deckId);
      return queue.cards
        .map((card) => createSrsItemFromCard(deckId, card, mode))
        .filter((item): item is SrsItem => item != null)
        .slice(0, maxItems);
    },
    staleTime: 15_000,
  });

  return useMemo(
    () => ({
      ...query,
      items: query.data ?? [],
    }),
    [query],
  );
}
