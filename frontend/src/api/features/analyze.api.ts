import axiosInstance from "../axios";

export interface AnalyzedToken {
  surface: string;
  reading: string | null;
  furigana: string | null;
  partOfSpeech: string;
  partOfSpeechVi: string;
  baseForm: string | null;
}

export interface AnalysisResult {
  originalText: string;
  tokenCount: number;
  tokens: AnalyzedToken[];
}

export const analyzeApi = {
  analyze: async (text: string): Promise<AnalysisResult> => {
    const res = await axiosInstance.post<AnalysisResult>("/analyze", { text });
    return res.data;
  },
};
