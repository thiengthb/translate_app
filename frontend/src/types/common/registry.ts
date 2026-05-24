import type { EntitySchema } from "@/types/common/datatable";

export interface EntityConfig {
    name: string;
    path: string;
    api: any;
    schema: EntitySchema;
}

const registry: EntityConfig[] = [];

export function registerEntity(entity: EntityConfig) {
    const existingIndex = registry.findIndex((item) => item.path === entity.path);

    if (existingIndex >= 0) {
        registry[existingIndex] = entity;
        return;
    }

    registry.push(entity);
}

export function getEntities() {
    return registry;
}