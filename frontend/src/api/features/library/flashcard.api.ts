import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type { FlashcardDTO, FlashcardFilter, FlashcardRenderDTO } from "@/types";

const base = createBaseApiService<FlashcardDTO, FlashcardFilter>({
  path: "/flashcards",
});

export const flashcardApi = {
  ...base,

  /** Fetch HTML-rendered front/back for a flashcard, using its template (or system default). */
  getRender: async (flashcardId: number): Promise<FlashcardRenderDTO> => {
    const res = await axiosInstance.get<FlashcardRenderDTO>(`/flashcards/${flashcardId}/render`);
    return res.data;
  },
};
