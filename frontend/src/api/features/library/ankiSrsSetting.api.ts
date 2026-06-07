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
  maximumIntervalDays?: number;
  rescheduleCardsOnChange?: boolean;
  suspendLeeches?: boolean;
  leechThreshold?: number;
}

export const ankiSrsSettingApi = Object.assign({}, base, {
  /** Get the current user's settings for a single deck (null if none saved yet). */
  getForDeck: async (deckId: number): Promise<AnkiSrsSettingDTO | null> => {
    const res = await axiosInstance.get<AnkiSrsSettingDTO | null>(
      `/anki/settings/deck/${deckId}`
    );
    return res.data && typeof res.data === "object" ? res.data : null;
  },

  /** Create or update the current user's settings for a single deck. */
  saveForDeck: async (
    deckId: number,
    payload: AnkiSrsSettingsRequest
  ): Promise<AnkiSrsSettingDTO> => {
    const res = await axiosInstance.put<AnkiSrsSettingDTO>(
      `/anki/settings/deck/${deckId}`,
      payload
    );
    return res.data;
  },
});
