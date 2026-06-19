import axiosInstance from "../axios";
import type {
    WordSearchResult, WordSuggestion, DictionaryKanjiDetail, FeaturedResult,
    TatoebaExample, WordAudio, DictionaryBrowsePage,
    NotebookResponse, NotebookWordEntry, NotebookKanjiEntry, NotebookSummary,
} from "@/types";

export const dictionaryApi = {
    search: async (q: string, limit = 20): Promise<WordSearchResult[]> => {
        const response = await axiosInstance.get<WordSearchResult[]>("/dictionary/search", {
            params: { q: q.trim(), limit },
        });
        return response.data;
    },

    // Chi tiết một từ (kèm nghĩa đa ngôn ngữ, hán tự và ví dụ) — dùng cho WordDetailPage.
    getWord: async (id: number): Promise<WordSearchResult> => {
        const response = await axiosInstance.get<WordSearchResult>(`/dictionary/words/${id}`);
        return response.data;
    },

    suggest: async (q: string, limit = 8): Promise<WordSuggestion[]> => {
        const response = await axiosInstance.get<WordSuggestion[]>("/dictionary/suggest", {
            params: { q: q.trim(), limit },
        });
        return response.data;
    },

    kanjiSearch: async (q: string, limit = 10): Promise<DictionaryKanjiDetail[]> => {
        const response = await axiosInstance.get<DictionaryKanjiDetail[]>("/dictionary/kanji-search", {
            params: { q: q.trim(), limit },
        });
        return response.data;
    },

    // Từ vựng tổng hợp — duyệt toàn bộ từ vựng / kanji (phân trang, lọc level).
    // level = undefined → tất cả level.
    browseWords: async (level: string | undefined, page = 0, size = 20): Promise<DictionaryBrowsePage<WordSearchResult>> => {
        const response = await axiosInstance.get<DictionaryBrowsePage<WordSearchResult>>("/dictionary/browse/words", {
            params: { level, page, size },
        });
        return response.data;
    },

    browseKanjis: async (level: string | undefined, page = 0, size = 24): Promise<DictionaryBrowsePage<DictionaryKanjiDetail>> => {
        const response = await axiosInstance.get<DictionaryBrowsePage<DictionaryKanjiDetail>>("/dictionary/browse/kanjis", {
            params: { level, page, size },
        });
        return response.data;
    },

    featured: async (wordLimit = 8, kanjiLimit = 12): Promise<FeaturedResult> => {
        const response = await axiosInstance.get<FeaturedResult>("/dictionary/featured", {
            params: { wordLimit, kanjiLimit },
        });
        return response.data;
    },

    recognizeHandwriting: async (strokes: Array<[number[], number[]]>): Promise<string[]> => {
        const response = await axiosInstance.post<string[]>("/dictionary/handwriting", { strokes });
        return response.data;
    },

    examples: async (word: string, limit = 6): Promise<TatoebaExample[]> => {
        const response = await axiosInstance.get<TatoebaExample[]>("/dictionary/examples", {
            params: { word: word.trim(), limit },
        });
        return response.data;
    },

    // Trả về null khi không có audio (HTTP 204) → frontend tự dùng Web Speech (TTS).
    audio: async (word: string): Promise<WordAudio | null> => {
        const response = await axiosInstance.get<WordAudio | "">("/dictionary/audio", {
            params: { word: word.trim() },
        });
        return response.data && typeof response.data === "object" ? response.data : null;
    },
};

// ── Sổ tay (per-user, lưu trên server) ─────────────────────────────────
export const notebookApi = {
    get: async (): Promise<NotebookResponse> => {
        const response = await axiosInstance.get<NotebookResponse>("/dictionary/notebook");
        return response.data;
    },

    saveWord: async (wordId: number): Promise<NotebookWordEntry> => {
        const response = await axiosInstance.post<NotebookWordEntry>(
            `/dictionary/notebook/words/${wordId}`);
        return response.data;
    },

    removeWord: async (wordId: number): Promise<void> => {
        await axiosInstance.delete(`/dictionary/notebook/words/${wordId}`);
    },

    saveKanji: async (character: string): Promise<NotebookKanjiEntry> => {
        const response = await axiosInstance.post<NotebookKanjiEntry>(
            `/dictionary/notebook/kanjis/${encodeURIComponent(character)}`);
        return response.data;
    },

    removeKanji: async (character: string): Promise<void> => {
        await axiosInstance.delete(`/dictionary/notebook/kanjis/${encodeURIComponent(character)}`);
    },

    updateNote: async (entryId: number, note: string): Promise<void> => {
        await axiosInstance.put(`/dictionary/notebook/entries/${entryId}/note`, { note });
    },

    clearAll: async (): Promise<void> => {
        await axiosInstance.delete("/dictionary/notebook");
    },

    // Merge các mục localStorage (lưu trước khi có backend / lưu lúc offline)
    // vào sổ tay mặc định trên server. Idempotent — trả về sổ tay đầy đủ sau merge.
    sync: async (wordIds: number[], kanjiChars: string[]): Promise<NotebookResponse> => {
        const response = await axiosInstance.post<NotebookResponse>(
            "/dictionary/notebook/sync", { wordIds, kanjiChars });
        return response.data;
    },
};

// ── Đa sổ tay (Mazii-style: tạo nhiều sổ tay, chọn sổ tay khi lưu) ──────
export const notebooksApi = {
    list: async (): Promise<NotebookSummary[]> => {
        const response = await axiosInstance.get<NotebookSummary[]>("/dictionary/notebooks");
        return response.data;
    },

    create: async (name: string, color?: string): Promise<NotebookSummary> => {
        const response = await axiosInstance.post<NotebookSummary>("/dictionary/notebooks", { name, color });
        return response.data;
    },

    update: async (id: number, name: string, color?: string): Promise<NotebookSummary> => {
        const response = await axiosInstance.put<NotebookSummary>(`/dictionary/notebooks/${id}`, { name, color });
        return response.data;
    },

    remove: async (id: number): Promise<void> => {
        await axiosInstance.delete(`/dictionary/notebooks/${id}`);
    },

    entries: async (id: number): Promise<NotebookResponse> => {
        const response = await axiosInstance.get<NotebookResponse>(`/dictionary/notebooks/${id}/entries`);
        return response.data;
    },

    addWord: async (notebookId: number, wordId: number): Promise<NotebookWordEntry> => {
        const response = await axiosInstance.post<NotebookWordEntry>(
            `/dictionary/notebooks/${notebookId}/words/${wordId}`);
        return response.data;
    },

    removeWord: async (notebookId: number, wordId: number): Promise<void> => {
        await axiosInstance.delete(`/dictionary/notebooks/${notebookId}/words/${wordId}`);
    },

    addKanji: async (notebookId: number, character: string): Promise<NotebookKanjiEntry> => {
        const response = await axiosInstance.post<NotebookKanjiEntry>(
            `/dictionary/notebooks/${notebookId}/kanjis/${encodeURIComponent(character)}`);
        return response.data;
    },

    removeKanji: async (notebookId: number, character: string): Promise<void> => {
        await axiosInstance.delete(`/dictionary/notebooks/${notebookId}/kanjis/${encodeURIComponent(character)}`);
    },

    // Id các sổ tay đang chứa từ/kanji — dùng để tích sẵn checkbox trong picker.
    wordMembership: async (wordId: number): Promise<number[]> => {
        const response = await axiosInstance.get<number[]>(`/dictionary/notebooks/membership/word/${wordId}`);
        return response.data;
    },

    kanjiMembership: async (character: string): Promise<number[]> => {
        const response = await axiosInstance.get<number[]>(
            `/dictionary/notebooks/membership/kanji/${encodeURIComponent(character)}`);
        return response.data;
    },
};