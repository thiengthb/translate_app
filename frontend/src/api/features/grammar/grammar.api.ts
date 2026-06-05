import { createBaseApiService } from "@/api/base-service.api";
import type { GrammarDTO, GrammarFilter } from "@/types";

export const grammarApi = Object.assign(
    {},
    createBaseApiService<GrammarDTO, GrammarFilter>({ path: "/grammars" })
);
