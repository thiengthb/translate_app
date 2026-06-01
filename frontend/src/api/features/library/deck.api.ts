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

  /** Deep-copy a public deck (and all its flashcards) into the current user's library. */
  clone: async (deckId: number): Promise<DeckDTO> => {
    const res = await axiosInstance.post<DeckDTO>(`/decks/${deckId}/clone`);
    return res.data;
  },

  /** Increment the deck's view count (fire-and-forget). */
  incrementView: async (deckId: number): Promise<void> => {
    try {
      await axiosInstance.post(`/decks/${deckId}/view`);
    } catch {
      // Non-fatal — viewing a deck shouldn't break the page
    }
  },
};
