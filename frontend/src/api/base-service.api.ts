import type { FileFormat, ImportResult, Pagination } from "@/types";
import type { PageResponse } from "@/types/common/pageable";
import type { AxiosInstance } from "axios";
import axiosInstance from "./axios";

export interface BaseApiService<DTO, Filter> {
    import(file: File): Promise<ImportResult>;
    export(format: FileFormat): Promise<Blob>;
    getPage(pagination: Pagination, search?: string, filter?: Filter): Promise<PageResponse<DTO>>;
    getById(id: string): Promise<DTO>;
    create(data: DTO): Promise<DTO>;
    update(id: string, data: DTO): Promise<DTO>;
    delete(id: string): Promise<void>;
    bulkDelete(ids: Array<string | number>): Promise<void>;
}

interface BaseApiConfig {
    path: string;
    instance?: AxiosInstance;
}

export const createBaseApiService = <DTO = any, Filter = any>({
    path,
    instance = axiosInstance,
}: BaseApiConfig): BaseApiService<DTO, Filter> => {
    return {
        import: async (file: File): Promise<ImportResult> => {
            const formData = new FormData();
            formData.append("file", file);
            const response = await instance.post<ImportResult>(`${path}/import`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return response.data;
        },

        export: async (format: FileFormat) => {
            return instance.get(`${path}/export`, {
                params: { format },
                responseType: "blob",
            });
        },

        getPage: async (pagination: Pagination, search?: string, filter?: Filter): Promise<PageResponse<DTO>> => {
            const { sort, ...rest } = pagination;
            const params = new URLSearchParams();

            Object.entries(rest).forEach(([key, value]) => {
                if (value !== undefined && value !== null) params.append(key, String(value));
            });

            if (sort) {
                const sortArr = Array.isArray(sort) ? sort : [sort];
                sortArr.forEach((s) => params.append("sort", s));
            }

            if (search) params.append("search", search);

            const serializeValue = (value: any) => {
                if (value instanceof Date) return value.toISOString();
                return String(value);
            };

            if (filter) {
                Object.entries(filter as Record<string, any>).forEach(([key, value]) => {
                    if (value === undefined || value === null) return;
                    if (typeof value === "string" && !value.trim()) return;
                    if (Array.isArray(value)) {
                        value.forEach((v) => params.append(key, serializeValue(v)));
                    } else {
                        params.append(key, serializeValue(value));
                    }
                });
            }

            const response = await instance.get<PageResponse<DTO>>(path, { params });
            return response.data;
        },

        getById: async (id: string): Promise<DTO> => {
            const response = await instance.get<DTO>(`${path}/${id}`);
            return response.data;
        },

        create: async (data: DTO): Promise<DTO> => {
            const response = await instance.post<DTO>(path, data);
            return response.data;
        },

        update: async (id: string, data: DTO): Promise<DTO> => {
            const response = await instance.put<DTO>(`${path}/${id}`, data);
            return response.data;
        },

        delete: async (id: string): Promise<void> => {
            await instance.delete(`${path}/${id}`);
        },

        bulkDelete: async (ids: Array<string | number>): Promise<void> => {
            await instance.post(`${path}/bulk-delete`, ids);
        },
    };
};
