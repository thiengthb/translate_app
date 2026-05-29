import { Clock, X } from "lucide-react";

import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    useSidebar,
} from "@/components/ui/sidebar";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";

import { NavItem } from "./NavItem";
import type { SidebarNavItem } from "./types";

interface RecentSectionProps {
    items: SidebarNavItem[];
    /** Drop a single entry from the MRU list. */
    onRemoveItem: (key: string) => void;
    /** Wipe all recent entries. */
    onClearAll: () => void;
}

/**
 * "Recent" section — shows the last few menu items the user visited,
 * MRU first.
 *
 * Each item has a hover-X to drop just that entry; the section header has
 * a trash button to nuke the whole list at once.
 *
 * Hidden in collapsed mode (would duplicate icons that already appear in
 * their groups) and when empty.
 */
export function RecentSection({
    items,
    onRemoveItem,
    onClearAll,
}: RecentSectionProps) {
    const { state } = useSidebar();
    if (state !== "expanded") return null;
    if (items.length === 0) return null;

    return (
        <SidebarGroup className="py-1 group-data-[collapsible=icon]:px-0">
            {/* Header mirrors PinnedSection exactly — same label
                typography + primary-tinted icon. The right-side
                clear-all button is the only visual difference, since
                Recent has a list to manage and Pin doesn't. */}
            <div className="flex items-center justify-between pr-1">
                <SidebarGroupLabel className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock size={11} className="text-primary" />
                    Recent
                </SidebarGroupLabel>
                <TooltipWrapper content="Xóa tất cả">
                    <button
                        type="button"
                        onClick={onClearAll}
                        aria-label="Xóa tất cả mục gần đây"
                        className="p-1 rounded text-muted-foreground/60 hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    >
                        <X size={12} />
                    </button>
                </TooltipWrapper>
            </div>
            <SidebarMenu>
                {items.map((item) => (
                    <NavItem
                        key={item.key}
                        item={item}
                        variant="top"
                        activeAppearance="soft"
                        onRemove={{
                            tooltip: "Xóa khỏi gần đây",
                            onRemove: () => onRemoveItem(item.key),
                        }}
                    />
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
