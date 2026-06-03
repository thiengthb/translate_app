import { createBaseApiService } from "@/api/base-service.api";
import type {
  KanjiDetailDTO, KanjiDetailFilter,
  KanjiReadingDTO, KanjiReadingFilter,
  KanjiStrokeOrderDTO, KanjiStrokeOrderFilter,
  KanjiDeckDTO, KanjiDeckFilter,
  KanjiDeckItemDTO, KanjiDeckItemFilter,
  KanjiStudySessionDTO, KanjiStudySessionFilter,
  KanjiSessionItemDTO, KanjiSessionItemFilter,
  KanjiProgressDTO, KanjiProgressFilter,
  KanjiWritingAttemptDTO, KanjiWritingAttemptFilter,
  KanjiReadingSetDTO, KanjiReadingSetFilter,
  KanjiReadingPassageDTO, KanjiReadingPassageFilter,
  KanjiReadingProgressDTO, KanjiReadingProgressFilter,
} from "@/types/features/kanji_study";

// Kanji data extensions
export const kanjiDetailApi = createBaseApiService<KanjiDetailDTO, KanjiDetailFilter>({ path: "/kanji-details" });
export const kanjiReadingApi = createBaseApiService<KanjiReadingDTO, KanjiReadingFilter>({ path: "/kanji-readings" });
export const kanjiStrokeOrderApi = createBaseApiService<KanjiStrokeOrderDTO, KanjiStrokeOrderFilter>({ path: "/kanji-stroke-orders" });

// Own study system (decks)
export const kanjiDeckApi = createBaseApiService<KanjiDeckDTO, KanjiDeckFilter>({ path: "/kanji-decks" });
export const kanjiDeckItemApi = createBaseApiService<KanjiDeckItemDTO, KanjiDeckItemFilter>({ path: "/kanji-deck-items" });

// Study runtime
export const kanjiStudySessionApi = createBaseApiService<KanjiStudySessionDTO, KanjiStudySessionFilter>({ path: "/kanji-study-sessions" });
export const kanjiSessionItemApi = createBaseApiService<KanjiSessionItemDTO, KanjiSessionItemFilter>({ path: "/kanji-session-items" });
export const kanjiProgressApi = createBaseApiService<KanjiProgressDTO, KanjiProgressFilter>({ path: "/kanji-progress" });
export const kanjiWritingAttemptApi = createBaseApiService<KanjiWritingAttemptDTO, KanjiWritingAttemptFilter>({ path: "/kanji-writing-attempts" });

// Graded reading
export const kanjiReadingSetApi = createBaseApiService<KanjiReadingSetDTO, KanjiReadingSetFilter>({ path: "/kanji-reading-sets" });
export const kanjiReadingPassageApi = createBaseApiService<KanjiReadingPassageDTO, KanjiReadingPassageFilter>({ path: "/kanji-reading-passages" });
export const kanjiReadingProgressApi = createBaseApiService<KanjiReadingProgressDTO, KanjiReadingProgressFilter>({ path: "/kanji-reading-progress" });
