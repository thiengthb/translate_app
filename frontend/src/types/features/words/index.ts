import type { BaseDTO, BaseFilter } from "@/types/common/base";

// ── Language ───────────────────────────────────────────────────────────
export interface LanguageDTO extends BaseDTO {
  code?: string;
  name?: string;
}

export interface LanguageFilter extends BaseFilter {}

// ── Level ──────────────────────────────────────────────────────────────
export interface LevelDTO extends BaseDTO {
  name?: string;
  code?: string;
}

export interface LevelFilter extends BaseFilter {}

// ── Representation ─────────────────────────────────────────────────────
export interface RepresentationDTO extends BaseDTO {
  name?: string;
  code?: string;
}

export interface RepresentationFilter extends BaseFilter {}

// ── Word type (part of speech) ─────────────────────────────────────────
export interface WordTypeDTO extends BaseDTO {
  name?: string;
  code?: string;
  description?: string;
}

export interface WordTypeFilter extends BaseFilter {}

// ── Meaning ────────────────────────────────────────────────────────────
export interface MeaningDTO extends BaseDTO {
  languageId?: number;
  languageName?: string;
  languageCode?: string;
  wordId?: number;
  wordText?: string;
  name?: string;
}

export interface MeaningFilter extends BaseFilter {
  languageId?: number;
  wordId?: number;
}

// ── Word ───────────────────────────────────────────────────────────────
export interface WordDTO extends BaseDTO {
  representationId?: number;
  representationName?: string;
  meaningText?: string;
  meanings?: MeaningDTO[];
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
  wordType?: string;
}

// ── Word create (composite: word + meanings + examples) ─────────────────
export interface WordMeaningInput {
  languageId?: number;
  name?: string;
}

export interface WordExampleInput {
  rootLanguageId?: number;
  toLanguageId?: number;
  rootExample?: string;
  toExample?: string;
}

export interface WordCreateRequest {
  word: string;
  reading?: string;
  wordType?: string;
  frequency?: number;
  representationId?: number;
  levelId?: number;
  meanings: WordMeaningInput[];
  examples: WordExampleInput[];
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

export interface DictionaryMeaningInfo {
  name?: string;
  languageCode?: string;
  languageName?: string;
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
  meanings?: DictionaryMeaningInfo[];
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

export interface DictionaryKanjiWordInfo {
  word: string;
  reading?: string;
  meaningText?: string;
}

export interface DictionaryKanjiDetail {
  character: string;
  meaning?: string;
  onyomi?: string;
  kunyomi?: string;
  stroke?: number;
  radical?: string;
  jlptLevel?: string;
  words: DictionaryKanjiWordInfo[];
}

export interface FeaturedResult {
  words: WordSearchResult[];
  kanjis: DictionaryKanjiDetail[];
}

// ── Browse (Từ vựng tổng hợp — duyệt toàn bộ, phân trang) ──────────────
export interface DictionaryBrowsePage<T> {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

// ── Tatoeba example sentences ──────────────────────────────────────────
export interface TatoebaExample {
  sentenceId?: number;
  japanese: string;
  reading?: string;
  translation: string;
  translationLang: string; // "vie" | "eng"
  source: string;
}

// ── Audio pronunciation ────────────────────────────────────────────────
export interface WordAudio {
  url: string;
  source: string; // "forvo"
}

// ── Grammar (expression) ───────────────────────────────────────────────
export interface GrammarDTO extends BaseDTO {
  slug?: string;
  form?: string;
  levelId?: number;
  /** JLPT code (e.g. "N4") of levelId — read-only, for display. */
  levelCode?: string;
  titleGloss?: string;
  textbookSources?: string[];
  notes?: string;
}

export interface GrammarFilter extends BaseFilter {
  levelId?: number;
}

// ── GrammarSubUse ──────────────────────────────────────────────────────
export interface CommonMistake {
  pattern?: string;
  hint?: string;
}

export interface GrammarSubUseDTO extends BaseDTO {
  name?: string;
  levelId?: number;
  /** JLPT code (e.g. "N4") of levelId — read-only, for display. */
  levelCode?: string;
  nuanceDescription?: string;
  detectorKey?: string;
  commonMistakes?: CommonMistake[];
}

export interface GrammarSubUseFilter extends BaseFilter {
  levelId?: number;
}

// ── GrammarMarker ──────────────────────────────────────────────────────
export interface GrammarMarkerDTO extends BaseDTO {
  subUseId?: number;
  subUseName?: string;
  markerPattern?: string;
  register?: string;
  frequencyRank?: number;
  detectorSubkey?: string;
}

export interface GrammarMarkerFilter extends BaseFilter {
  subUseId?: number;
}

// ── ReferenceSentence ──────────────────────────────────────────────────
export interface ReferenceSentenceDTO extends BaseDTO {
  subUseId?: number;
  subUseName?: string;
  l1Text?: string;
  l2Text?: string;
}

export interface ReferenceSentenceFilter extends BaseFilter {
  subUseId?: number;
}

// ── ScenarioStub ───────────────────────────────────────────────────────
export interface ScenarioStubDTO extends BaseDTO {
  subUseId?: number;
  subUseName?: string;
  situationContext?: string;
  register?: string;
  l1PromptTemplate?: string;
}

export interface ScenarioStubFilter extends BaseFilter {
  subUseId?: number;
}

// ── Notebook (sổ tay từ vựng/kanji lưu trên server, per-user) ──────────
export interface NotebookWordEntry {
  entryId: number;
  note?: string;
  savedAt?: string;
  word: WordSearchResult;
}

export interface NotebookKanjiEntry {
  entryId: number;
  note?: string;
  savedAt?: string;
  kanji: DictionaryKanjiDetail;
}

export interface NotebookResponse {
  words: NotebookWordEntry[];
  kanjis: NotebookKanjiEntry[];
}

// Một sổ tay (đa sổ tay kiểu Mazii) — tóm tắt cho danh sách & picker.
export interface NotebookSummary {
  id: number;
  name: string;
  color?: string;
  isDefault: boolean;
  sortOrder: number;
  wordCount: number;
  kanjiCount: number;
  createdAt?: string;
}