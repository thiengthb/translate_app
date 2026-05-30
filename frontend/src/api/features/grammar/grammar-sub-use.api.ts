import { createBaseApiService } from "@/api/base-service.api";
import type { GrammarSubUseDTO, GrammarSubUseFilter } from "@/types";

export const grammarSubUseApi = Object.assign(
    {},
    createBaseApiService<GrammarSubUseDTO, GrammarSubUseFilter>({ path: "/grammar-sub-uses" })
);
