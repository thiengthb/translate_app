import { createBaseApiService } from "@/api/base-service.api";
import axiosInstance from "@/api/axios";
import type { WordDTO, WordFilter, WordCreateRequest } from "@/types";

export const wordApi = Object.assign(
    {},
    createBaseApiService<WordDTO, WordFilter>({ path: "/words" }),
    {
        /** Tạo từ vựng kèm nhiều nghĩa (đa ngôn ngữ) và ví dụ trong một lần.
         *  Endpoint nằm dưới /dictionary để không chặn auto-CRUD của /words. */
        createFull: async (data: WordCreateRequest): Promise<WordDTO> => {
            const response = await axiosInstance.post<WordDTO>("/dictionary/words", data);
            return response.data;
        },
    }
);