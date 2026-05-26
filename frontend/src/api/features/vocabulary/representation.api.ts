import { createBaseApiService } from "@/api/base-service.api";
import type { RepresentationDTO, RepresentationFilter } from "@/types";

const path = "/representations";

const base = createBaseApiService<RepresentationDTO, RepresentationFilter>({ path });

export const representationApi = Object.assign({}, base, {});
