import { createBaseApiService } from "@/api/base-service.api";
import type { TagDTO, TagFilter } from "@/types";

const base = createBaseApiService<TagDTO, TagFilter>({
  path: "/tags",
});

export const tagApi = Object.assign({}, base, {});
