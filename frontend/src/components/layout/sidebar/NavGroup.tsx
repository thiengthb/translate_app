import { ChevronRight } from "lucide-react";

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import { NavItem } from "./NavItem";
import type { SidebarNavGroup } from "./types";

interface NavGroupProps {
    group: SidebarNavGroup;
    /** Render mode: when sidebar is collapsed we show items as icon-only and
     *  drop the group title row entirely (icons alone). */
    collapsed: boolean;
    /** Controlled open state for the group's collapsible. */
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    /** Optional favorite toggles per-item. Wired up by the parent. */
    favoriteFor?: (itemKey: string) => {
        isFavorite: boolean;
        onToggle: () => void;
    };
}

/**
 * A single module group. Expanded: header row + collapsible sub-items.
 * Collapsed: just the icons stacked (no group title, since there's no
 * room for it — section dividers handle visual separation upstream).
 */
export function NavGroup({
    group,
    collapsed,
    isOpen,
    onOpenChange,
    favoriteFor,
}: NavGroupProps) {
    const groupActive = group.items.some((i) => i.isActive);

    if (collapsed) {
        return (
            <>
                {group.items.map((item) => (
                    <NavItem
                        key={item.key}
                        item={item}
                        variant="top"
                        collapsed
                    />
                ))}
            </>
        );
    }

    return (
        <Collapsible
            asChild
            open={isOpen}
            onOpenChange={onOpenChange}
            className="group/collapsible"
        >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    {/*
                     * Group header. Visual rule:
                     *   - Selected sub-item inside the group → tiny
                     *     primary dot to the left of the name.
                     *   - No solid background or text recoloring on the
                     *     header itself — the canonical active state
                     *     belongs to the sub-item row (or, when the
                     *     group is closed, the dot is the cue).
                     *
                     * `aria-current="true"` exposes the same signal to
                     * assistive tech without painting the row.
                     */}
                    <SidebarMenuButton
                        tooltip={group.name}
                        aria-current={groupActive ? "true" : undefined}
                    >
                        {/* Dot indicator. Always rendered (transparent
                            when inactive) so the title doesn't shift
                            horizontally when activeness flips. The
                            `transition-colors` makes the swap feel
                            intentional rather than abrupt. */}
                        <span
                            aria-hidden
                            className={cn(
                                "h-1.5 w-1.5 shrink-0 rounded-full transition-colors",
                                groupActive
                                    ? "bg-primary shadow-[0_0_6px_color-mix(in_oklch,var(--primary)_60%,transparent)]"
                                    : "bg-transparent",
                            )}
                        />
                        <span
                            className={cn(
                                "truncate transition-colors",
                                groupActive && "text-foreground font-medium",
                            )}
                        >
                            {group.name}
                        </span>
                        <ChevronRight
                            className="
                                ml-auto transition-transform duration-200
                                group-data-[state=open]/collapsible:rotate-90
                            "
                        />
                    </SidebarMenuButton>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <SidebarMenuSub>
                        {group.items.map((item) => (
                            <NavItem
                                key={item.key}
                                item={item}
                                variant="sub"
                                favorite={favoriteFor?.(item.key)}
                            />
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}
