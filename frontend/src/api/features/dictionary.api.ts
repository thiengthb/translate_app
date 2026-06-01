import axiosInstance from "../axios";
import type {
    WordSearchResult, WordSuggestion, DictionaryKanjiDetail, FeaturedResult,
    TatoebaExample, WordAudio,
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