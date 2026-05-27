import axiosInstance from "../axios";
import type { PublicModule } from "@/types/features/publicapi";

export const publicApi = {
    getPublicModules: async (): Promise<PublicModule[]> => {
        const response = await axiosInstance.get<PublicModule[]>("/public/modules");
        return response.data;
    },
};
