import { createBaseApiService } from "@/api/base-service.api";
import axiosInstance from "@/api/axios";
import type { WordDTO, WordFilter, WordCreateRequest } from "@/types";

export const wordApi = Object.assign(
    {},
    createBaseApiService<WordDTO, WordFilter>({ path: "/words" }),
    {
        /** Tạo từ vựng kèm nhiều nghĩa (đa ngôn ngữ) và ví dụ trong một lần. */
        createFull: async (data: WordCreateRequest): Promise<WordDTO> => {
            const response = await axiosInstance.post<WordDTO>("/words/full", data);
            return response.data;
        },
    }
);