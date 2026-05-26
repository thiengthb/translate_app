import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface LanguageDTO extends BaseDTO {
  code?: string;
  name?: string;
}

export interface LanguageFilter extends BaseFilter {}
