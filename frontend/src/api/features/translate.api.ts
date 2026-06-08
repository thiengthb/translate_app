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

/** Fast analysis: romaji + JLPT grammar (deterministic, no LLM). */
export interface GrammarAnalysisResult {
  /** Hepburn romaji of the main translation (null for non-Japanese targets). */
  romaji: string | null;
  grammar: GrammarPoint[];
}

/** Slow analysis: alternative translations via the Ollama LLM. */
export interface AlternativesAnalysisResult {
  alternatives: Alternative[];
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

  /** Fast: romaji + JLPT grammar (deterministic, returns in ms). */
  analyzeGrammar: async (
    params: AnalyzeParams,
  ): Promise<GrammarAnalysisResult> => {
    const res = await axiosInstance.post<GrammarAnalysisResult>(
      "/translate/analyze/grammar",
      params,
    );
    return res.data;
  },

  /** Slow: alternative translations via the Ollama LLM. */
  analyzeAlternatives: async (
    params: AnalyzeParams,
  ): Promise<AlternativesAnalysisResult> => {
    const res = await axiosInstance.post<AlternativesAnalysisResult>(
      "/translate/analyze/alternatives",
      params,
    );
    return res.data;
  },
};
