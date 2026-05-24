import axiosInstance from "../axios";

// ---- Types ----

export interface FileAttachmentDTO {
  id: number;
  originalName: string;
  storedName: string;
  contentType: string;
  fileSize: number;
  storagePath: string;
  storageType: string;
  entityName: string;
  entityId: number;
  fieldName: string;
  url: string;
  createdAt: string;
}

// ---- API ----

export const fileApi = {
  upload: async (
    file: File,
    entityName?: string,
    entityId?: number,
    fieldName?: string,
  ): Promise<FileAttachmentDTO> => {
    const formData = new FormData();
    formData.append("file", file);
    if (entityName) formData.append("entityName", entityName);
    if (entityId) formData.append("entityId", entityId.toString());
    if (fieldName) formData.append("fieldName", fieldName);

    const response = await axiosInstance.post<FileAttachmentDTO>("/files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  getByEntity: async (entityName: string, entityId: number): Promise<FileAttachmentDTO[]> => {
    const response = await axiosInstance.get<FileAttachmentDTO[]>(
      `/files/entity/${entityName}/${entityId}`,
    );
    return response.data;
  },

  delete: async (fileId: number): Promise<void> => {
    await axiosInstance.delete(`/files/${fileId}`);
  },

  getDownloadUrl: (storedName: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:8080/api";
    return `${baseUrl}/files/${storedName}`;
  },
};
