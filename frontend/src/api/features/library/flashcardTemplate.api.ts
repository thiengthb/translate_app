import axiosInstance from "@/api/axios";
import { createBaseApiService } from "@/api/base-service.api";
import type {
  CreateUpdateTemplateRequest,
  FlashcardTemplateDTO,
  FlashcardTemplateFilter,
} from "@/types";

const base = createBaseApiService<FlashcardTemplateDTO, FlashcardTemplateFilter>({
  path: "/flashcard-templates",
});

export const flashcardTemplateApi = {
  ...base,

  /** Get the system default template for a given card type, or null if none exists. */
  getDefault: async (cardType: string): Promise<FlashcardTemplateDTO | null> => {
    const res = await axiosInstance.get<FlashcardTemplateDTO | null>(
      `/flashcard-templates/default`,
      { params: { cardType } }
    );
    return res.data ?? null;
  },

  /** List templates available for a user (server returns user-owned + system templates). */
  listForUser: async (userId?: number): Promise<FlashcardTemplateDTO[]> => {
    const res = await axiosInstance.get<{ content?: FlashcardTemplateDTO[] } | FlashcardTemplateDTO[]>(
      `/flashcard-templates`,
      { params: { userId, page: 0, size: 200 } }
    );
    const data = res.data;
    if (Array.isArray(data)) return data;
    return data.content ?? [];
  },

  createTemplate: async (data: CreateUpdateTemplateRequest): Promise<FlashcardTemplateDTO> => {
    const res = await axiosInstance.post<FlashcardTemplateDTO>(`/flashcard-templates`, data);
    return res.data;
  },

  updateTemplate: async (
    id: number,
    data: CreateUpdateTemplateRequest
  ): Promise<FlashcardTemplateDTO> => {
    const res = await axiosInstance.put<FlashcardTemplateDTO>(`/flashcard-templates/${id}`, data);
    return res.data;
  },

  deleteTemplate: async (id: number): Promise<void> => {
    await axiosInstance.delete(`/flashcard-templates/${id}`);
  },
};
