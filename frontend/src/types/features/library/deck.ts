import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface DeckDTO extends BaseDTO {
  userId?: number;
  folderId?: number;
  originalDeckId?: number;
  tagIds?: number[];
  title?: string;
  description?: string;
  visibility?: string;
  studyMode?: "QUIZLET" | "ANKI";
  coverImageUrl?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  totalCards?: number;
  templateId?: number | null;
}

export interface DeckFilter extends BaseFilter {
  userId?: number;
  folderId?: number;
  title?: string;
  visibility?: string;
}

export interface ApplyTemplateRequest {
  templateId: number;
}
