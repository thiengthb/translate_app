import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface FolderDTO extends BaseDTO {
  userId?: number;
  name?: string;
  description?: string;
}

export interface FolderFilter extends BaseFilter {
  userId?: number;
  name?: string;
}
