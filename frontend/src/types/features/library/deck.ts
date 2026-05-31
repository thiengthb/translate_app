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
  deckIcon?: string;
  deckColor?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  totalCards?: number;
  cloneCount?: number;
  favoriteCount?: number;
  viewCount?: number;
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
