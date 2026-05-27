import { createBaseApiService } from "@/api/base-service.api";
import type { WordKanjiDTO, WordKanjiFilter } from "@/types";

export const wordKanjiApi = Object.assign(
    {},
    createBaseApiService<WordKanjiDTO, WordKanjiFilter>({ path: "/word-kanjis" })
);