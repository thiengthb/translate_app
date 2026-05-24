import { useQuery } from "@tanstack/react-query";
import { metadataApi, type EntityMetadata } from "@/api/features/metadata.api";

export function useEntityMetadata() {
  return useQuery<EntityMetadata[]>({
    queryKey: ["metadata", "entities"],
    queryFn: metadataApi.getAll,
    staleTime: 1000 * 60 * 30, // 30 min cache
    gcTime: 1000 * 60 * 60, // 1 hour GC
  });
}

export function useEntityMetadataByName(name: string) {
  return useQuery<EntityMetadata>({
    queryKey: ["metadata", "entities", name],
    queryFn: () => metadataApi.getByName(name),
    enabled: !!name,
    staleTime: 1000 * 60 * 30,
  });
}
