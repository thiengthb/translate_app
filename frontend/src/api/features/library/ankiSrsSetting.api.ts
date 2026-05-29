import { createBaseApiService } from "@/api/base-service.api";
import axiosInstance from "@/api/axios";
import type { AnkiSrsSettingDTO, AnkiSrsSettingFilter } from "@/types";

const base = createBaseApiService<AnkiSrsSettingDTO, AnkiSrsSettingFilter>({
  path: "/anki/settings",
});

export interface AnkiSrsSettingsRequest {
  algorithmConfigId?: number;
  algorithmConfigJson?: string;
  targetRetention?: number;
  maxReviewsPerDay?: number;
  maxItemsPerDay?: number;
  buryRelatedItems?: boolean;
}

export const ankiSrsSettingApi = Object.assign({}, base, {
  getMine: async (): Promise<AnkiSrsSettingDTO | null> => {
    const res = await axiosInstance.get<AnkiSrsSettingDTO | null>("/anki/settings/mine");
    return res.data && typeof res.data === "object" ? res.data : null;
  },

  saveMine: async (payload: AnkiSrsSettingsRequest): Promise<AnkiSrsSettingDTO> => {
    const res = await axiosInstance.put<AnkiSrsSettingDTO>("/anki/settings/mine", payload);
    return res.data;
  },

  getForUser: async (userId: number): Promise<AnkiSrsSettingDTO | null> => {
    const res = await base.getPage(
      { page: 0, size: 1 },
      undefined,
      { userId, isActive: true },
    );
    const items = res.content ?? (res as any).items ?? [];
    return items[0] ?? null;
  },
});
