import { Star } from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    useSidebar,
} from "@/components/ui/sidebar";

import { NavItem } from "./NavItem";
import type { SidebarNavItem } from "./types";

interface PinnedSectionProps {
    items: SidebarNavItem[];
    favoriteFor: (key: string) => { isFavorite: boolean; onToggle: () => void };
}

/**
 * "Favorites" pill section at the top of the sidebar. Hidden when no
 * items are pinned (zero-config — user sees it after first pin).
 *
 * Collapsed mode: renders as icon-only stack so the user still has
 * 1-click access to their pinned items.
 */
export function PinnedSection({ items, favoriteFor }: PinnedSectionProps) {
    const { state } = useSidebar();
    if (items.length === 0) return null;
    const isCollapsed = state !== "expanded";

    return (
        <SidebarGroup className="py-1">
            {!isCollapsed && (
                <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Star size={11} className="text-amber-500 fill-amber-500" />
                    Yêu thích
                </SidebarGroupLabel>
            )}
            <SidebarMenu>
                {items.map((item) => (
                    <NavItem
                        key={item.key}
                        item={item}
                        variant="top"
                        collapsed={isCollapsed}
                        favorite={!isCollapsed ? favoriteFor(item.key) : undefined}
                    />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
