import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface DeckDTO extends BaseDTO {
  userId?: number;
  folderId?: number;
  originalDeckId?: number;
  tagIds?: number[];
  title?: string;
  description?: string;
  visibility?: string;
  coverImageUrl?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  totalCards?: number;
}

export interface DeckFilter extends BaseFilter {
  userId?: number;
  folderId?: number;
  title?: string;
  visibility?: string;
}
