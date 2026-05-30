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
};
