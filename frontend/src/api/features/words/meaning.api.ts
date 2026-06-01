import { createBaseApiService } from "@/api/base-service.api";
import type { MeaningDTO, MeaningFilter } from "@/types";

export const meaningApi = Object.assign(
    {},
    createBaseApiService<MeaningDTO, MeaningFilter>({ path: "/meanings" })
);