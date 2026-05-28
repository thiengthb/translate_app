import axiosInstance from "../axios";
import type { WordSearchResult, WordSuggestion } from "@/types";

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

    recognizeHandwriting: async (strokes: Array<[number[], number[]]>): Promise<string[]> => {
        const response = await axiosInstance.post<string[]>("/dictionary/handwriting", { strokes });
        return response.data;
    },
};