import { Pin } from "lucide-react";

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
 * "Pin" section at the top of the sidebar — modules the user has
 * pinned for quick access.
 *
 * Hidden when:
 *   - no items are pinned (zero-config — user sees it after first pin)
 *   - the sidebar is collapsed (matches RecentSection behavior — the
 *     pinned modules already live in their groups below, so duplicating
 *     them as icons in collapsed mode just doubles the icon column)
 */
export function PinnedSection({ items, favoriteFor }: PinnedSectionProps) {
    const { state } = useSidebar();
    if (state !== "expanded") return null;
    if (items.length === 0) return null;

    return (
        <SidebarGroup className="py-1">
            {/* Header treatment mirrors RecentSection — same tiny
                uppercase label + primary-tinted icon — so the two
                "secondary" sections read as a coherent block above
                the module-group list. */}
            <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Pin size={11} className="text-primary fill-primary/40 rotate-45" />
                Pinned
            </SidebarGroupLabel>
            <SidebarMenu>
                {items.map((item) => (
                    <NavItem
                        key={item.key}
                        item={item}
                        variant="top"
                        activeAppearance="soft"
                        favorite={favoriteFor(item.key)}
                    />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
