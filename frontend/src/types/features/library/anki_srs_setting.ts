import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface AnkiSrsSettingDTO extends BaseDTO {
  userId?: number;
  deckId?: number;
  algorithmConfigId?: number;
  targetRetention?: number;
  maxReviewsPerDay?: number;
  maxItemsPerDay?: number;
  buryRelatedItems?: boolean;
  maximumIntervalDays?: number;
  rescheduleCardsOnChange?: boolean;
  suspendLeeches?: boolean;
  leechThreshold?: number;
}

export interface AnkiSrsSettingFilter extends Partial<BaseFilter> {
  userId?: number;
  deckId?: number;
  algorithmConfigId?: number;
}
