import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface FavoriteDeckDTO extends BaseDTO {
  userId?: number;
  deckId?: number;
}

export interface FavoriteDeckFilter extends BaseFilter {
  userId?: number;
  deckId?: number;
}
