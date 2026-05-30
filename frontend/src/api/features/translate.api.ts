import axiosInstance from "../axios";

/** DeepL formality option. "default" means "don't send the param". */
export type Formality = "default" | "more" | "less" | "prefer_more" | "prefer_less";

export interface TranslateParams {
  text: string;
  /** undefined / "" ⇒ let DeepL auto-detect the source language. */
  sourceLang?: string;
  targetLang: string;
  formality?: Formality;
}

export interface TranslateResult {
  translatedText: string;
  detectedSourceLang: string | null;
  targetLang: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  supportsFormality: boolean;
}

/** One alternative translation, with romaji when the target is Japanese. */
export interface Alternative {
  text: string;
  romaji: string | null;
}

/** A JLPT grammar pattern spotted in the translated sentence. */
export interface GrammarPoint {
  pattern: string;
  level: string | null;
  meaning: string | null;
  matchedText: string | null;
  /** "dictionary" (deterministic) or "ai" (LLM supplement). */
  source: string;
}

export interface TranslateAnalysisResult {
  /** Hepburn romaji of the main translation (null for non-Japanese targets). */
  romaji: string | null;
  alternatives: Alternative[];
  grammar: GrammarPoint[];
}

export interface AnalyzeParams {
  /** Original source text (context for alternatives). */
  text: string;
  /** The translation to analyse. */
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
}

export const translateApi = {
  translate: async (params: TranslateParams): Promise<TranslateResult> => {
    const res = await axiosInstance.post<TranslateResult>("/translate", params);
    return res.data;
  },

  getLanguages: async (type: "source" | "target"): Promise<LanguageOption[]> => {
    const res = await axiosInstance.get<LanguageOption[]>("/translate/languages", {
      params: { type },
    });
    return res.data;
  },

  analyze: async (params: AnalyzeParams): Promise<TranslateAnalysisResult> => {
    const res = await axiosInstance.post<TranslateAnalysisResult>(
      "/translate/analyze",
      params,
    );
    return res.data;
  },
};
