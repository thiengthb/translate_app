import { createBaseApiService } from "@/api/base-service.api";
import type { MeaningDTO, MeaningFilter } from "@/types";

const path = "/meanings";

const base = createBaseApiService<MeaningDTO, MeaningFilter>({ path });

export const meaningApi = Object.assign({}, base, {});
