import type { BaseDTO, BaseFilter } from "@/types/common/base";

export interface SrsAlgorithmConfigDTO extends BaseDTO {
  code?: string;
  name?: string;
  algorithmType?: "SM2" | "FSRS" | "CUSTOM" | string;
  configJson?: string;
  enabled?: boolean;
}

export interface SrsAlgorithmConfigFilter extends Partial<BaseFilter> {
  code?: string;
  name?: string;
  algorithmType?: string;
  enabled?: boolean;
}
