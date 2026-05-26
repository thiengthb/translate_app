import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface MeaningDTO extends BaseDTO {
  /** FK — ID of the Language this meaning belongs to */
  languageId?: number;
  /** Read-only display — populated from Language.name by the backend */
  languageName?: string;
  name?: string;
}

export interface MeaningFilter extends BaseFilter {
  languageId?: number;
}
