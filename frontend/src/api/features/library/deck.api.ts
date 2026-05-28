import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type { DeckDTO, DeckFilter } from "@/types";

const base = createBaseApiService<DeckDTO, DeckFilter>({
  path: "/decks",
});

export const deckApi = {
  ...base,

  /** Apply a template to the entire deck (overrides system default for all its cards). */
  applyTemplate: async (deckId: number, templateId: number): Promise<DeckDTO> => {
    const res = await axiosInstance.put<DeckDTO>(`/decks/${deckId}/template`, { templateId });
    return res.data;
  },

  /** Clear the deck's template — cards fall back to the system default at render time. */
  removeTemplate: async (deckId: number): Promise<DeckDTO> => {
    const res = await axiosInstance.delete<DeckDTO>(`/decks/${deckId}/template`);
    return res.data;
  },
};
