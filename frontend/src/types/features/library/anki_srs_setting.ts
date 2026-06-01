import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface AnkiSrsSettingDTO extends BaseDTO {
  userId?: number;
  deckId?: number;
  algorithmConfigId?: number;
  targetRetention?: number;
  maxReviewsPerDay?: number;
  maxItemsPerDay?: number;
  buryRelatedItems?: boolean;
}

export interface AnkiSrsSettingFilter extends Partial<BaseFilter> {
  userId?: number;
  deckId?: number;
  algorithmConfigId?: number;
}
