import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface FlashcardDTO extends BaseDTO {
  itemId?: number;
  itemType?: string;
  wordId?: number;
  cardType?: string;
  front?: string;
  back?: string;
  imageUrl?: string;
  audioUrl?: string;
  hint?: string;
  explanation?: string;
}

export interface FlashcardFilter extends BaseFilter {
  wordId?: number;
  cardType?: string;
  itemType?: string;
  front?: string;
}
