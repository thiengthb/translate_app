import axiosInstance from "../axios";
import type {
    WordSearchResult, WordSuggestion, DictionaryKanjiDetail, FeaturedResult,
    TatoebaExample, WordAudio, DictionaryBrowsePage,
    NotebookResponse, NotebookWordEntry, NotebookKanjiEntry,
} from "@/types";

export const dictionaryApi = {
    search: async (q: string, limit = 20): Promise<WordSearchResult[]> => {
        const response = await axiosInstance.get<WordSearchResult[]>("/dictionary/search", {
            params: { q: q.trim(), limit },
        });
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
    // vào sổ tay server. Idempotent — trả về sổ tay đầy đủ sau merge.
    sync: async (wordIds: number[], kanjiChars: string[]): Promise<NotebookResponse> => {
        const response = await axiosInstance.post<NotebookResponse>(
            "/dictionary/notebook/sync", { wordIds, kanjiChars });
        return response.data;
    },
};