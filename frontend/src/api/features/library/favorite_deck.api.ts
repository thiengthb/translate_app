import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type { FavoriteDeckDTO, FavoriteDeckFilter } from "@/types";

const base = createBaseApiService<FavoriteDeckDTO, FavoriteDeckFilter>({
  path: "/favorite-decks",
});

export const favoriteDeckApi = {
  ...base,

  /** All favorite decks belonging to a specific user. Pulls up to 500 entries. */
  listForUser: async (userId: number): Promise<FavoriteDeckDTO[]> => {
    const res = await axiosInstance.get<{ content?: FavoriteDeckDTO[] }>(`/favorite-decks`, {
      params: { userId, page: 0, size: 500 },
    });
    return res.data.content ?? [];
  },

  /** Add the given deck to the current user's favorites. */
  favorite: async (userId: number, deckId: number): Promise<FavoriteDeckDTO> => {
    const res = await axiosInstance.post<FavoriteDeckDTO>(`/favorite-decks`, {
      userId,
      deckId,
      isActive: true,
    });
    return res.data;
  },

  /** Delete a favorite entry by id (server uses BaseCrud delete). */
  unfavorite: async (favoriteId: number): Promise<void> => {
    await axiosInstance.delete(`/favorite-decks/${favoriteId}`);
  },
};
