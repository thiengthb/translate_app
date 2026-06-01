import { createBaseApiService } from "@/api/base-service.api";
import type { KanjiDTO, KanjiFilter } from "@/types";

export const kanjiApi = Object.assign(
    {},
    createBaseApiService<KanjiDTO, KanjiFilter>({ path: "/kanjis" })
);