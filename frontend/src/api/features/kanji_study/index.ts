import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type { PageResponse } from "@/types/common/pageable";
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
  KanjiSentencePage, KanjiWordDetail,
  KanjiDeckGroupOpResult, KanjiDeckPasteResult, KanjiDeckRemoveResult,
  KanjiQuizSubmitRequest, KanjiQuizSubmitResult, KanjiStudyStats, KanjiRecentSession,
} from "@/types/features/kanji_study";

// Kanji data extensions
export const kanjiDetailApi = createBaseApiService<KanjiDetailDTO, KanjiDetailFilter>({ path: "/kanji-details" });

// Relevance-ranked kanji search ("CHỮ HÁN" tab): meaning (whole-word), on/kun
// reading, romaji ("jigoku" → じごく) and Hán-Việt — ranked, not raw LIKE.
export const kanjiSearchApi = {
  searchKanji: async (q: string, page = 0, size = 20): Promise<PageResponse<KanjiDetailDTO>> => {
    const response = await axiosInstance.get<PageResponse<KanjiDetailDTO>>("/kanji-details/search", {
      params: { q, page, size },
    });
    return response.data;
  },
};
export const kanjiReadingApi = createBaseApiService<KanjiReadingDTO, KanjiReadingFilter>({ path: "/kanji-readings" });
export const kanjiRadicalApi = createBaseApiService<KanjiRadicalDTO, KanjiRadicalFilter>({ path: "/kanji-radicals" });

// Own study system (decks)
export const kanjiDeckApi = createBaseApiService<KanjiDeckDTO, KanjiDeckFilter>({ path: "/kanji-decks" });
export const kanjiDeckItemApi = createBaseApiService<KanjiDeckItemDTO, KanjiDeckItemFilter>({ path: "/kanji-deck-items" });

// Deck organize — split/merge study groups + clipboard paste/remove.
export const kanjiDeckOrganizeApi = {
  splitGroup: async (
    deckId: number | string,
    body: { groupIndex?: number | null; size: number; repeat?: boolean },
  ): Promise<KanjiDeckGroupOpResult> => {
    const response = await axiosInstance.post<KanjiDeckGroupOpResult>(
      `/kanji-decks/${deckId}/groups/split`, body,
    );
    return response.data;
  },
  mergeGroups: async (
    deckId: number | string,
    groupIndexes?: number[],
  ): Promise<KanjiDeckGroupOpResult> => {
    const response = await axiosInstance.post<KanjiDeckGroupOpResult>(
      `/kanji-decks/${deckId}/groups/merge`, { groupIndexes: groupIndexes ?? [] },
    );
    return response.data;
  },
  pasteKanji: async (deckId: number | string, kanjiIds: number[]): Promise<KanjiDeckPasteResult> => {
    const response = await axiosInstance.post<KanjiDeckPasteResult>(
      `/kanji-decks/${deckId}/items/paste`, { kanjiIds },
    );
    return response.data;
  },
  removeKanji: async (deckId: number | string, kanjiIds: number[]): Promise<KanjiDeckRemoveResult> => {
    const response = await axiosInstance.post<KanjiDeckRemoveResult>(
      `/kanji-decks/${deckId}/items/remove`, { kanjiIds },
    );
    return response.data;
  },
};

// Study runtime
export const kanjiStudySessionApi = createBaseApiService<KanjiStudySessionDTO, KanjiStudySessionFilter>({ path: "/kanji-study-sessions" });

// Save a finished session + per deck/group stats (Trắc nghiệm "save option").
export const kanjiStudyApi = {
  submit: async (payload: KanjiQuizSubmitRequest): Promise<KanjiQuizSubmitResult> => {
    const response = await axiosInstance.post<KanjiQuizSubmitResult>(
      "/kanji-study-sessions/submit", payload,
    );
    return response.data;
  },
  stats: async (deckId?: number, groupIndex?: number | null): Promise<KanjiStudyStats> => {
    const response = await axiosInstance.get<KanjiStudyStats>("/kanji-study-sessions/stats", {
      params: {
        deckId,
        groupIndex: groupIndex ?? undefined,
      },
    });
    return response.data;
  },
  recent: async (limit = 6): Promise<KanjiRecentSession[]> => {
    const response = await axiosInstance.get<KanjiRecentSession[]>("/kanji-study-sessions/recent", {
      params: { limit },
    });
    return response.data;
  },
};
export const kanjiSessionItemApi = createBaseApiService<KanjiSessionItemDTO, KanjiSessionItemFilter>({ path: "/kanji-session-items" });
export const kanjiProgressApi = createBaseApiService<KanjiProgressDTO, KanjiProgressFilter>({ path: "/kanji-progress" });
export const kanjiWritingAttemptApi = createBaseApiService<KanjiWritingAttemptDTO, KanjiWritingAttemptFilter>({ path: "/kanji-writing-attempts" });

// Graded reading
export const kanjiReadingSetApi = createBaseApiService<KanjiReadingSetDTO, KanjiReadingSetFilter>({ path: "/kanji-reading-sets" });
export const kanjiReadingPassageApi = createBaseApiService<KanjiReadingPassageDTO, KanjiReadingPassageFilter>({ path: "/kanji-reading-passages" });
export const kanjiReadingProgressApi = createBaseApiService<KanjiReadingProgressDTO, KanjiReadingProgressFilter>({ path: "/kanji-reading-progress" });

// Chiết tự — Hán tự chứa một thành phần (element/original trong cây KanjiVG).
export const kanjiComponentApi = {
  kanjiByComponent: async (component: string, page = 0, size = 24): Promise<PageResponse<KanjiDetailDTO>> => {
    const response = await axiosInstance.get<PageResponse<KanjiDetailDTO>>(
      `/kanji-details/by-component/${encodeURIComponent(component)}`,
      { params: { page, size } },
    );
    return response.data;
  },
};

// Từ vựng (Kanji Study): tìm kiếm + trang chi tiết từ + câu ví dụ chứa từ.
export const kanjiWordApi = {
  search: async (q: string, page = 0, size = 20): Promise<KanjiVocabWordPage> => {
    const response = await axiosInstance.get<KanjiVocabWordPage>("/kanji-words/search", {
      params: { q, page, size },
    });
    return response.data;
  },
  detail: async (id: number | string): Promise<KanjiWordDetail> => {
    const response = await axiosInstance.get<KanjiWordDetail>(`/kanji-words/${id}`);
    return response.data;
  },
  sentences: async (id: number | string, page = 0, size = 20): Promise<KanjiSentencePage> => {
    const response = await axiosInstance.get<KanjiSentencePage>(`/kanji-words/${id}/sentences`, {
      params: { page, size },
    });
    return response.data;
  },
};

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
  // Câu ví dụ chứa kanji (furigana + bản dịch, câu ngắn trước).
  sentences: async (character: string, page = 0, size = 20): Promise<KanjiSentencePage> => {
    const response = await axiosInstance.get<KanjiSentencePage>(
      `/kanji-details/${encodeURIComponent(character)}/sentences`,
      { params: { page, size } },
    );
    return response.data;
  },
};
