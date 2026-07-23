import axiosInstance from "@/api/axios";
import type {
  DeckImportConfirmRequest,
  DeckImportDelimiter,
  DeckImportPreviewLimit,
  DeckImportPreviewResponse,
  DeckImportResultResponse,
} from "@/types";

export const deckImportApi = {
  preview: async (
    file: File,
    options?: { delimiter?: DeckImportDelimiter; header?: boolean; previewPage?: number; previewRows?: DeckImportPreviewLimit },
  ): Promise<DeckImportPreviewResponse> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post<DeckImportPreviewResponse>("/deck-import/preview", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      params: {
        delimiter: options?.delimiter ?? "AUTO",
        previewPage: options?.previewPage ?? 1,
        previewRows: options?.previewRows ?? 10,
        ...(options?.header !== undefined ? { header: options.header } : {}),
      },
    });
    return response.data;
  },

  confirm: async (request: DeckImportConfirmRequest): Promise<DeckImportResultResponse> => {
    const response = await axiosInstance.post<DeckImportResultResponse>("/deck-import/confirm", request);
    return response.data;
  },

  getBatch: async (batchId: number): Promise<DeckImportResultResponse> => {
    const response = await axiosInstance.get<DeckImportResultResponse>(`/deck-import/batches/${batchId}`);
    return response.data;
  },

  downloadTemplate: async (): Promise<Blob> => {
    const response = await axiosInstance.get("/deck-import/deck-template", { responseType: "blob" });
    return response.data;
  },
};
