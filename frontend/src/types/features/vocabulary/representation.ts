import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface RepresentationDTO extends BaseDTO {
  name?: string;
  code?: string;
}

export interface RepresentationFilter extends BaseFilter {}
