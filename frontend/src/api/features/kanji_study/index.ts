import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type {
  KanjiDetailDTO, KanjiDetailFilter,
  KanjiReadingDTO, KanjiReadingFilter,
  KanjiRadicalDTO, KanjiRadicalFilter,
  KanjiDeckDTO, KanjiDeckFilter,
  KanjiDeckItemDTO, KanjiDeckItemFilter,
  KanjiStudySessionDTO, KanjiStudySessionFilter,
  KanjiSessionItemDTO, KanjiSessionItemFilter,
  KanjiProgressDTO, KanjiProgressFilter,
  KanjiWritingAttemptDTO, KanjiWritingAttemptFilter,
  KanjiReadingSetDTO, KanjiReadingSetFilter,
  KanjiReadingPassageDTO, KanjiReadingPassageFilter,
  KanjiReadingProgressDTO, KanjiReadingProgressFilter,
  KanjiVocabWordPage, KanjiVocabReadingGroup,
} from "@/types/features/kanji_study";

// Kanji data extensions
export const kanjiDetailApi = createBaseApiService<KanjiDetailDTO, KanjiDetailFilter>({ path: "/kanji-details" });
export const kanjiReadingApi = createBaseApiService<KanjiReadingDTO, KanjiReadingFilter>({ path: "/kanji-readings" });
export const kanjiRadicalApi = createBaseApiService<KanjiRadicalDTO, KanjiRadicalFilter>({ path: "/kanji-radicals" });

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

// Vocabulary linked to a kanji — powers the kanji detail page's word sections.
export const kanjiVocabularyApi = {
  // Từ vựng chứa kanji (phân trang, tần suất cao trước).
  words: async (character: string, page = 0, size = 20): Promise<KanjiVocabWordPage> => {
    const response = await axiosInstance.get<KanjiVocabWordPage>(
      `/kanji-details/${encodeURIComponent(character)}/words`,
      { params: { page, size } },
    );
    return response.data;
  },
  // Ví dụ phát âm — từ vựng nhóm theo âm đọc (on/kun) của kanji.
  readingExamples: async (character: string, samples = 8): Promise<KanjiVocabReadingGroup[]> => {
    const response = await axiosInstance.get<KanjiVocabReadingGroup[]>(
      `/kanji-details/${encodeURIComponent(character)}/reading-examples`,
      { params: { samples } },
    );
    return response.data;
  },
};
