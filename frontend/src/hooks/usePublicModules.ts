import { useQuery } from "@tanstack/react-query";
import { publicApi } from "@/api/features/public.api";
import type { PublicModule } from "@/types/features/publicapi";

export function usePublicModules() {
    return useQuery<PublicModule[]>({
        queryKey: ["public-modules"],
        queryFn: publicApi.getPublicModules,
        staleTime: 5 * 60 * 1000,
    });
}
