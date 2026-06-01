import { useCallback, useEffect, useState } from "react";
import { deckApi, deckItemApi, flashcardApi, quizletStudyApi } from "@/api";
import type { QuizletProgressDTO } from "@/api";
import type { DeckDTO, FlashcardDTO } from "@/types";
import { logger } from "@/lib/logger";
import type { StudyCard } from "./types";

interface DeckStudyData {
  loading: boolean;
  accessDenied: boolean;
  deck: DeckDTO | null;
  setDeck: React.Dispatch<React.SetStateAction<DeckDTO | null>>;
  cards: StudyCard[];
  /** Quizlet progress keyed by flashcardId (null until first load completes). */
  progressByCard: Map<number, QuizletProgressDTO>;
  reloadProgress: () => void;
}

/**
 * Loads everything the unified study screen needs, once: the deck, its cards
 * (deck items joined to flashcards) and the user's Quizlet progress.
 *
 * SRS data is intentionally NOT loaded here — the SRS mode fetches its own
 * queue lazily so that opening the study screen in a non-SRS mode never even
 * reads scheduling state.
 */
export function useDeckStudyData(deckId?: string): DeckStudyData {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [cards, setCards] = useState<StudyCard[]>([]);
  const [progressByCard, setProgressByCard] = useState<Map<number, QuizletProgressDTO>>(new Map());

  const reloadProgress = useCallback(() => {
    if (!deckId) return;
    quizletStudyApi
      .getProgress(Number(deckId))
      .then((list) => setProgressByCard(new Map(list.map((p) => [p.flashcardId, p]))))
      .catch((err) => logger.warn("Failed to load quizlet progress", err));
  }, [deckId]);

  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setAccessDenied(false);
      try {
        const [deckData, itemsPage] = await Promise.all([
          deckApi.getById(deckId),
          deckItemApi.getPage({ page: 0, size: 200 }, undefined, { deckId: Number(deckId) } as never),
        ]);
        if (cancelled) return;
        setDeck(deckData);

        const items = itemsPage.content ?? [];
        if (items.length === 0) {
          setCards([]);
        } else {
          const flashcardIds = items.map((it) => it.flashcardId).filter(Boolean) as number[];
          const fcPage = await flashcardApi.getPage(
            { page: 0, size: 200 },
            undefined,
            { ids: flashcardIds } as never
          );
          if (cancelled) return;
          const fcList: FlashcardDTO[] = fcPage.content ?? [];
          const fcMap = new Map(fcList.map((fc) => [fc.id, fc]));

          const sorted: StudyCard[] = items
            .map((it) => ({
              deckItemId: it.id as number,
              orderIndex: it.orderIndex ?? 0,
              flashcard: it.flashcardId != null ? fcMap.get(it.flashcardId) : undefined,
            }))
            .filter((e): e is StudyCard => e.flashcard != null)
            .sort((a, b) => a.orderIndex - b.orderIndex);
          setCards(sorted);
        }

        // Progress is best-effort; never block the study screen on it.
        try {
          const progress = await quizletStudyApi.getProgress(Number(deckId));
          if (!cancelled) {
            setProgressByCard(new Map(progress.map((p) => [p.flashcardId, p])));
          }
        } catch (err) {
          logger.warn("Failed to load quizlet progress", err);
        }
      } catch (err: unknown) {
        const status =
          (err as { response?: { status?: number }; status?: number })?.response?.status ??
          (err as { status?: number })?.status;
        if (!cancelled && (status === 403 || status === 401)) setAccessDenied(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [deckId]);

  return { loading, accessDenied, deck, setDeck, cards, progressByCard, reloadProgress };
}
