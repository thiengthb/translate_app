import { AutoCrudPage } from "@/pages/management/AutoCrudPage";
import type { EntityConfig } from "@/types";
import { createElement, type ComponentType } from "react";

type EntityModule = {
    entityConfig?: EntityConfig;
};

const entityModules = import.meta.glob("../pages/management/**/index.tsx", {
    eager: true,
}) as Record<string, EntityModule>;

type EntityRoute = {
    path: string;
    component: ComponentType<Record<string, never>>;
    isModuleDriven: boolean;
};

function getEntityConfigs(): EntityConfig[] {
    const entitiesByPath = new Map<string, EntityConfig>();

    for (const moduleExports of Object.values(entityModules)) {
        const config = moduleExports.entityConfig;

        if (!config) {
            continue;
        }

        entitiesByPath.set(config.path, config);
    }

    return [...entitiesByPath.values()];
}

export function buildEntityRoutes(): EntityRoute[] {
    const entities = getEntityConfigs();

    return entities.map((entity) => ({
        path: entity.path,
        component: () => createElement(AutoCrudPage, { entity }),
        isModuleDriven: true,
    }));
}
