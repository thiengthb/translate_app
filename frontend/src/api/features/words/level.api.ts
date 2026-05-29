import { createBaseApiService } from "@/api/base-service.api";
import type { LevelDTO, LevelFilter } from "@/types";

export const levelApi = Object.assign(
    {},
    createBaseApiService<LevelDTO, LevelFilter>({ path: "/levels" })
);