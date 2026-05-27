import { usePermissions } from "@/hooks/usePermissions";
import { useMemo } from "react";

const SPECIAL_RESOURCES: Record<string, string> = {
    module: "MENU",
    "module-group": "MENU",
    module_group: "MENU",
};

const resolvePermissionResource = (entityName: string) => {
    const normalised = (entityName || "").trim().toLowerCase();
    if (normalised in SPECIAL_RESOURCES) return SPECIAL_RESOURCES[normalised];
    return normalised.replace(/[-\s]+/g, "_").toUpperCase();
};

export interface TablePermissions {
    resource: string;
    keys: {
        read: string;
        create: string;
        update: string;
        delete: string;
        import: string;
        export: string;
    };
    canRead: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
}

export function useTablePermissions(entityName: string): TablePermissions {
    const { hasPermission } = usePermissions();

    const resource = useMemo(() => resolvePermissionResource(entityName), [entityName]);

    const keys = useMemo(
        () => ({
            read: `${resource}_READ`,
            create: `${resource}_CREATE`,
            update: `${resource}_UPDATE`,
            delete: `${resource}_DELETE`,
            import: `${resource}_CREATE`,
            export: `${resource}_READ`,
        }),
        [resource],
    );

    return useMemo(
        () => ({
            resource,
            keys,
            canRead: hasPermission(keys.read),
            canCreate: hasPermission(keys.create),
            canUpdate: hasPermission(keys.update),
            canDelete: hasPermission(keys.delete),
            canImport: hasPermission(keys.import),
            canExport: hasPermission(keys.export),
        }),
        [resource, keys, hasPermission],
    );
}
