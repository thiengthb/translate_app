import { createBaseApiService } from "@/api/base-service.api";
import type { WordTypeDTO, WordTypeFilter } from "@/types";

export const wordTypeApi = Object.assign(
    {},
    createBaseApiService<WordTypeDTO, WordTypeFilter>({ path: "/word-types" })
);
