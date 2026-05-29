import { createBaseApiService } from "@/api/base-service.api";
import type { SrsAlgorithmConfigDTO, SrsAlgorithmConfigFilter } from "@/types";

const base = createBaseApiService<SrsAlgorithmConfigDTO, SrsAlgorithmConfigFilter>({
  path: "/anki/algorithm-configs",
});

export const srsAlgorithmConfigApi = Object.assign({}, base, {
  getEnabled: async (): Promise<SrsAlgorithmConfigDTO[]> => {
    const res = await base.getPage(
      { page: 0, size: 100, sort: "name,asc" },
      undefined,
      { enabled: true, isActive: true },
    );
    return res.content ?? (res as any).items ?? [];
  },
});
