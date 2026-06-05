import type { BaseDTO, BaseFilter } from "@/types/common/base";

// ── Kanji Detail (the self-contained kanji master record) ────────────────
export interface KanjiDetailDTO extends BaseDTO {
  character?: string;
  onyomi?: string;
  kunyomi?: string;
  meaning?: string;
  jlptLevel?: string;
  radicalId?: number;
  strokeCount?: number;
  strokeData?: string;
  svgViewbox?: string;
  strokeSource?: string;
  formExplanation?: string;
  etymology?: string;
}

export interface KanjiDetailFilter extends BaseFilter {
  character?: string;
  jlptLevel?: string;
  radicalId?: number;
}

// ── Kanji Reading (Hán-Việt / nanori) ────────────────────────────────────
export type KanjiReadingType = "HAN_VIET" | "NANORI";

export interface KanjiReadingDTO extends BaseDTO {
  kanjiId?: number;
  readingType?: KanjiReadingType | string;
  value?: string;
  priority?: number;
}

export interface KanjiReadingFilter extends BaseFilter {
  kanjiId?: number;
  readingType?: string;
}

// ── Kanji Radical (bộ thủ) ───────────────────────────────────────────────
export interface KanjiRadicalDTO extends BaseDTO {
  number?: number;
  character?: string;
  hanViet?: string;
  meaning?: string;
  strokeCount?: number;
}

export interface KanjiRadicalFilter extends BaseFilter {
  number?: number;
  strokeCount?: number;
}

// ── Kanji Deck ───────────────────────────────────────────────────────────
export interface KanjiDeckDTO extends BaseDTO {
  userId?: number;
  title?: string;
  description?: string;
  visibility?: string;
  isSystem?: boolean;
  jlptLevel?: string;
  coverImageUrl?: string;
  totalKanji?: number;
}

export interface KanjiDeckFilter extends BaseFilter {
  userId?: number;
  title?: string;
  visibility?: string;
  isSystem?: boolean;
  jlptLevel?: string;
}

// ── Kanji Deck Item (junction deck ↔ kanji) ──────────────────────────────
export interface KanjiDeckItemDTO extends BaseDTO {
  deckId?: number;
  kanjiId?: number;
  orderIndex?: number;
}

export interface KanjiDeckItemFilter extends BaseFilter {
  deckId?: number;
  kanjiId?: number;
}

// ── Kanji Study Session ──────────────────────────────────────────────────
export type KanjiStudyMode = "FLASHCARD" | "QUIZ" | "WRITING" | "READING";

export interface KanjiStudySessionDTO extends BaseDTO {
  userId?: number;
  deckId?: number;
  mode?: KanjiStudyMode | string;
  startedAt?: string;
  endedAt?: string;
  totalItems?: number;
  completedItems?: number;
}

export interface KanjiStudySessionFilter extends BaseFilter {
  userId?: number;
  deckId?: number;
  mode?: string;
}

// ── Kanji Session Item ───────────────────────────────────────────────────
export interface KanjiSessionItemDTO extends BaseDTO {
  sessionId?: number;
  kanjiId?: number;
  itemOrder?: number;
  userAnswer?: string;
  isCorrect?: boolean;
  responseTimeMs?: number;
  status?: string;
  answeredAt?: string;
}

export interface KanjiSessionItemFilter extends BaseFilter {
  sessionId?: number;
  kanjiId?: number;
  status?: string;
}

// ── Kanji Progress (per user × kanji) ────────────────────────────────────
export type KanjiProgressStatus = "NEW" | "LEARNING" | "KNOWN";

export interface KanjiProgressDTO extends BaseDTO {
  userId?: number;
  kanjiId?: number;
  status?: KanjiProgressStatus | string;
  correctCount?: number;
  wrongCount?: number;
  intervalDays?: number;
  easeFactor?: number;
  nextReviewAt?: string;
  lastStudiedAt?: string;
}

export interface KanjiProgressFilter extends BaseFilter {
  userId?: number;
  kanjiId?: number;
  status?: string;
}

// ── Kanji Writing Attempt ────────────────────────────────────────────────
export interface KanjiWritingAttemptDTO extends BaseDTO {
  userId?: number;
  kanjiId?: number;
  sessionItemId?: number;
  accuracyScore?: number;
  strokesDrawn?: number;
  passed?: boolean;
  attemptData?: string;
}

export interface KanjiWritingAttemptFilter extends BaseFilter {
  userId?: number;
  kanjiId?: number;
  passed?: boolean;
}

// ── Kanji Reading Set (graded reading) ───────────────────────────────────
export interface KanjiReadingSetDTO extends BaseDTO {
  title?: string;
  description?: string;
  level?: string;
  orderIndex?: number;
}

export interface KanjiReadingSetFilter extends BaseFilter {
  title?: string;
  level?: string;
}

// ── Kanji Reading Passage ────────────────────────────────────────────────
export interface KanjiReadingPassageDTO extends BaseDTO {
  setId?: number;
  content?: string;
  furigana?: string;
  translationVi?: string;
  orderIndex?: number;
}

export interface KanjiReadingPassageFilter extends BaseFilter {
  setId?: number;
}

// ── Kanji Reading Progress ───────────────────────────────────────────────
export interface KanjiReadingProgressDTO extends BaseDTO {
  userId?: number;
  setId?: number;
  passageId?: number;
  status?: string;
  completedAt?: string;
}

export interface KanjiReadingProgressFilter extends BaseFilter {
  userId?: number;
  setId?: number;
  status?: string;
}
