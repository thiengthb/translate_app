import { useMemo } from "react";
import type { SidebarNavGroup } from "../types";

/**
 * Case-insensitive substring match over group name + item title.
 *
 * Matching strategy:
 *   - If a GROUP name matches, all its items show (you wanted that group).
 *   - Otherwise only items whose title matches are kept, and the group
 *     is dropped if no items survive.
 *
 * Empty query short-circuits to the original array — no allocation cost
 * for the steady state.
 */
export function useFilteredNavGroups(
    groups: SidebarNavGroup[],
    query: string,
): SidebarNavGroup[] {
    return useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return groups;

        const matches = (s: string) => s.toLowerCase().includes(q);

        return groups
            .map((g) => {
                if (matches(g.name)) return g;
                const items = g.items.filter((i) => matches(i.title));
                if (items.length === 0) return null;
                return { ...g, items };
            })
            .filter((g): g is SidebarNavGroup => g !== null);
    }, [groups, query]);
}
