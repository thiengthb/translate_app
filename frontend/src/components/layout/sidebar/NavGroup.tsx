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
                    <SidebarMenuButton
                        tooltip={group.name}
                        isActive={groupActive}
                        className="
                            data-[active=true]:data-[state=closed]:bg-primary
                            data-[active=true]:data-[state=closed]:text-primary-foreground
                        "
                    >
                        <span className="truncate">{group.name}</span>
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
