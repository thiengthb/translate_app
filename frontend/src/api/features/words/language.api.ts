import { createBaseApiService } from "@/api/base-service.api";
import type { LanguageDTO, LanguageFilter } from "@/types";

export const languageApi = Object.assign(
    {},
    createBaseApiService<LanguageDTO, LanguageFilter>({ path: "/languages" })
);