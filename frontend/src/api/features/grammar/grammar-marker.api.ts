import { createBaseApiService } from "@/api/base-service.api";
import type { GrammarMarkerDTO, GrammarMarkerFilter } from "@/types";

export const grammarMarkerApi = Object.assign(
    {},
    createBaseApiService<GrammarMarkerDTO, GrammarMarkerFilter>({ path: "/grammar-markers" })
);
