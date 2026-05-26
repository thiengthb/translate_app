import { createBaseApiService } from "@/api/base-service.api";
import type { FlashcardDTO, FlashcardFilter } from "@/types";

const base = createBaseApiService<FlashcardDTO, FlashcardFilter>({
  path: "/flashcards",
});

export const flashcardApi = Object.assign({}, base, {});
