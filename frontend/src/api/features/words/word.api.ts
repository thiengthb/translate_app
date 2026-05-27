import { createBaseApiService } from "@/api/base-service.api";
import type { WordDTO, WordFilter } from "@/types";

export const wordApi = Object.assign(
    {},
    createBaseApiService<WordDTO, WordFilter>({ path: "/words" })
);