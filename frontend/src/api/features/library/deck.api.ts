import { createBaseApiService } from "@/api/base-service.api";
import type { DeckDTO, DeckFilter } from "@/types";

const base = createBaseApiService<DeckDTO, DeckFilter>({
  path: "/decks",
});

export const deckApi = Object.assign({}, base, {});
