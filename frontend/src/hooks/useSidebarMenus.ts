import { moduleApi, moduleGroupApi } from "@/api";
import { usePermissions } from "@/hooks/usePermissions";
import type { ModuleDTO, ModuleGroupDTO, Pagination } from "@/types";
import type { RootState } from "@/store/store";
import { canAccessByPermission } from "@/utils/rbac.utils";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";

export type SidebarModule = ModuleDTO & {
    name?: string;
};

export type SidebarModuleGroup = ModuleGroupDTO & {
    modules: SidebarModule[];
};

/**
 * Menu entries intentionally hidden from the sidebar (and therefore from the
 * module-driven routes built off this data). These resources still exist as
 * CRUD endpoints — the study/dictionary features use them programmatically —
 * we just don't want admins poking at the raw tables directly.
 */
const HIDDEN_GROUP_NAMES = new Set(["Anki SRS", "Quizlet"]);
const HIDDEN_MODULE_URLS = new Set([
    "/meanings",
    "/word-kanjis",
    "/examples",
    "/notifications",
]);

const menuPagination: Pagination = {
    page: 0,
    size: 9999,
    sort: ["displayOrder,asc", "name,asc"],
};

const modulePagination: Pagination = {
    page: 0,
    size: 9999,
    sort: ["displayOrder,asc", "title,asc"],
};

export function useActiveModuleGroups(enabled = true) {
    const { activeRole, hasPermission } = usePermissions();
    // Module/module-group endpoints require auth. Gate the query on the auth
    // flag here (not just at call sites) so a caller that forgets to pass
    // `enabled` — e.g. useAppMeta, mounted on /login & the guest landing —
    // can't fire authed requests that 401 → /auth/refresh → hard redirect →
    // reload → loop (the ERR_INSUFFICIENT_RESOURCES storm).
    const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);

    return useQuery<SidebarModuleGroup[]>({
        queryKey: ["sidebar-menu", "active-module-groups", activeRole],
        enabled: enabled && isAuthenticated,
        queryFn: async () => {
            const [groupPage, modulePage] = await Promise.all([
                moduleGroupApi.getPage(menuPagination, undefined, { ids: [], isActive: true }),
                moduleApi.getPage(modulePagination, undefined, { ids: [], isActive: true }),
            ]);

            const groups = (groupPage.content ?? groupPage.items ?? []).filter(
                (group) => !HIDDEN_GROUP_NAMES.has(group.name ?? ""),
            );
            const modules = (modulePage.content ?? modulePage.items ?? [])
                .filter((module) => !HIDDEN_MODULE_URLS.has(module.url ?? ""))
                .filter((module) =>
                    canAccessByPermission(module.requiredPermission, hasPermission),
                );

            const groupedModules = modules.reduce<Record<string, SidebarModule[]>>((acc, module) => {
                if (!module.moduleGroupId) return acc;

                if (!acc[module.moduleGroupId]) {
                    acc[module.moduleGroupId] = [];
                }

                acc[module.moduleGroupId].push({
                    ...module,
                    name: module.title,
                });
                return acc;
            }, {});

            return groups
                .map((group) => ({
                    ...group,
                    modules: groupedModules[group.id ?? ""] ?? [],
                }))
                .filter((group) => group.modules.length > 0);
        },
        staleTime: 5 * 60 * 1000,
        // Keep the last good menu while a refetch (or an activeRole queryKey
        // change) is in flight. Without this the data resets to [] for a beat,
        // which unregisters every module-driven route (incl. /dashboard) and
        // empties the sidebar — so navigating "home" hits NotFoundRedirect and
        // 404s. Retaining the previous data keeps those routes alive.
        placeholderData: keepPreviousData,
    });
}
