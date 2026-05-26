import { createBaseApiService } from "@/api/base-service.api";
import type { DeckItemDTO, DeckItemFilter } from "@/types";

const base = createBaseApiService<DeckItemDTO, DeckItemFilter>({
  path: "/deck-items",
});

export const deckItemApi = Object.assign({}, base, {});
