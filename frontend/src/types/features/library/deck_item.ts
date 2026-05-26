import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface DeckItemDTO extends BaseDTO {
  deckId?: number;
  flashcardId?: number;
  orderIndex?: number;
}

export interface DeckItemFilter extends BaseFilter {
  deckId?: number;
  flashcardId?: number;
}
