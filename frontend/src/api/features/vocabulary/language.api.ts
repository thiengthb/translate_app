import { createBaseApiService } from "@/api/base-service.api";
import type { LanguageDTO, LanguageFilter } from "@/types";

const path = "/languages";

const base = createBaseApiService<LanguageDTO, LanguageFilter>({ path });

export const languageApi = Object.assign({}, base, {});
