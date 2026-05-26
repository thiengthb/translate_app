import { createBaseApiService } from "@/api/base-service.api";
import type { LevelDTO, LevelFilter } from "@/types";

const path = "/levels";

const base = createBaseApiService<LevelDTO, LevelFilter>({ path });

export const levelApi = Object.assign({}, base, {});
