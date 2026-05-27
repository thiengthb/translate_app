import type { BaseDTO, BaseFilter } from "@/types/common/base";

// ── Word ───────────────────────────────────────────────────────────────
export interface WordDTO extends BaseDTO {
  representationId?: number;
  representationName?: string;
  meaningId?: number;
  meaningName?: string;
  levelId?: number;
  levelName?: string;
  word?: string;
  reading?: string;
  wordType?: string;
  frequency?: number;
}

export interface WordFilter extends BaseFilter {
  levelId?: number;
  representationId?: number;
  meaningId?: number;
  wordType?: string;
}

// ── Kanji ──────────────────────────────────────────────────────────────
export interface KanjiDTO extends BaseDTO {
  character?: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  jlptLevel?: string;
  stroke?: number;
  radical?: string;
}

export interface KanjiFilter extends BaseFilter {
  character?: string;
  jlptLevel?: string;
}

// ── Example ────────────────────────────────────────────────────────────
export interface ExampleDTO extends BaseDTO {
  rootLanguageId?: number;
  rootLanguageName?: string;
  toLanguageId?: number;
  toLanguageName?: string;
  wordId?: number;
  rootExample?: string;
  toExample?: string;
}

export interface ExampleFilter extends BaseFilter {
  wordId?: number;
  rootLanguageId?: number;
  toLanguageId?: number;
}

// ── WordKanji ──────────────────────────────────────────────────────────
export interface WordKanjiDTO extends BaseDTO {
  wordId?: number;
  kanjiId?: number;
  character?: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  stroke?: number;
  radical?: string;
}

export interface WordKanjiFilter extends BaseFilter {
  wordId?: number;
  kanjiId?: number;
}

// ── Dictionary Search ─────────────────────────────────────────────────
export interface DictionaryKanjiInfo {
  character?: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  stroke?: number;
  radical?: string;
}

export interface DictionaryExampleInfo {
  rootExample?: string;
  toExample?: string;
  rootLanguageName?: string;
  toLanguageName?: string;
}

export interface WordSearchResult {
  id: number;
  word: string;
  reading?: string;
  wordType?: string;
  frequency?: number;
  representationCode?: string;
  representationName?: string;
  meaningText?: string;
  levelCode?: string;
  levelName?: string;
  kanjis: DictionaryKanjiInfo[];
  examples: DictionaryExampleInfo[];
}

export interface WordSuggestion {
  id: number;
  word: string;
  reading?: string;
  meaningText?: string;
  levelCode?: string;
}