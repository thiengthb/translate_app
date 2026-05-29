import { createBaseApiService } from "@/api/base-service.api";
import type { FolderDTO, FolderFilter } from "@/types";

const base = createBaseApiService<FolderDTO, FolderFilter>({
  path: "/folders",
});

export const folderApi = Object.assign({}, base, {});
