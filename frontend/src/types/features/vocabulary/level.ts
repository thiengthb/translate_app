import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface LevelDTO extends BaseDTO {
  name?: string;
  code?: string;
}

export interface LevelFilter extends BaseFilter {}
