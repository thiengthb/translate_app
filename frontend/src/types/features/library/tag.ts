import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface TagDTO extends BaseDTO {
  userId?: number;
  name?: string;
  color?: string;
  description?: string;
}

export interface TagFilter extends BaseFilter {
  userId?: number;
  name?: string;
}
