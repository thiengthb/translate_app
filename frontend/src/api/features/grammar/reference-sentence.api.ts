import { createBaseApiService } from "@/api/base-service.api";
import type { ReferenceSentenceDTO, ReferenceSentenceFilter } from "@/types";

export const referenceSentenceApi = Object.assign(
    {},
    createBaseApiService<ReferenceSentenceDTO, ReferenceSentenceFilter>({ path: "/reference-sentences" })
);
