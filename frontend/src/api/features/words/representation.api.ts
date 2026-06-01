import { createBaseApiService } from "@/api/base-service.api";
import type { RepresentationDTO, RepresentationFilter } from "@/types";

export const representationApi = Object.assign(
    {},
    createBaseApiService<RepresentationDTO, RepresentationFilter>({ path: "/representations" })
);