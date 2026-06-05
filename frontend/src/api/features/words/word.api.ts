import { createBaseApiService } from "@/api/base-service.api";
import axiosInstance from "@/api/axios";
import type { WordDTO, WordFilter, WordCreateRequest, FileFormat, ImportResult } from "@/types";

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

        /** Export RIÊNG cho từ vựng: mỗi dòng = 1 từ kèm nghĩa + ví dụ (gộp ô).
         *  Ghi đè export mặc định (vốn chỉ xuất field phẳng). */
        export: async (format: FileFormat) => {
            return axiosInstance.get("/dictionary/words/export", {
                params: { format },
                responseType: "blob",
            });
        },

        /** Import RIÊNG cho từ vựng theo template (tái dùng luồng tạo từ đầy đủ). */
        import: async (file: File): Promise<ImportResult> => {
            const formData = new FormData();
            formData.append("file", file);
            const response = await axiosInstance.post<ImportResult>(
                "/dictionary/words/import",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } },
            );
            return response.data;
        },
    }
);