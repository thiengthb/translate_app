import { Pin, X } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import {
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

import type { SidebarBadge, SidebarNavItem } from "./types";

interface NavItemProps {
    item: SidebarNavItem;
    /** Render mode. Group-children use "sub" (smaller indent); flat sections
     *  like Favorites/Recent use "top" (full-row sized like a group header). */
    variant: "sub" | "top";
    /** Icon-only mode when sidebar is collapsed. */
    collapsed?: boolean;
    /** Visual tone for the item background — Recent rows use "secondary" to
     *  separate them from default-tone module-group items. */
    tone?: "default" | "secondary";
    /**
     * Active-state appearance:
     *   "soft"  (default)  — logo-like soft tint: bg-primary/10 +
     *                        text-primary + 1px primary border.
     *                        Subtle, elegant, used everywhere in
     *                        expanded mode so the whole sidebar shares
     *                        one consistent "you are here" idiom.
     *   "solid"            — bold bg-primary fill. Reserved for the
     *                        collapsed icon-only column where a quiet
     *                        tint reads as "not selected" at a glance.
     */
    activeAppearance?: "soft" | "solid";
    /** When provided, show a star toggle. `true` = filled (already pinned). */
    favorite?: {
        isFavorite: boolean;
        onToggle: () => void;
    };
    /** When provided, show an X button (e.g. remove from Recent). Only one of
     *  `favorite` / `onRemove` is typically wired per usage site. */
    onRemove?: {
        tooltip?: string;
        onRemove: () => void;
    };
}

/**
 * Active-state class set per appearance mode.
 *
 * Soft mode uses `border border-transparent` as a baseline so the row
 * height stays stable when active flips on — without the transparent
 * border the row would shift 1px when picking up `border-primary/30`.
 */
const ACTIVE_CLASSES: Record<NonNullable<NavItemProps["activeAppearance"]>, string> =
    {
        soft:
            "border border-transparent " +
            "data-[active=true]:!bg-primary/10 " +
            "data-[active=true]:!text-primary " +
            "data-[active=true]:!border-primary/30 " +
            "data-[active=true]:font-medium",
        solid:
            "data-[active=true]:!bg-primary " +
            "data-[active=true]:!text-primary-foreground",
    };

function badgeVariantToClass(variant: SidebarBadge["variant"]): string {
    switch (variant) {
        case "destructive":
            return "bg-destructive text-destructive-foreground";
        case "outline":
            return "border-border bg-transparent text-foreground";
        case "default":
            return "bg-primary text-primary-foreground";
        case "secondary":
        default:
            return "bg-muted text-foreground";
    }
}

/**
 * Single nav row. Three render modes:
 *
 *   collapsed         → icon-only square (tooltip on hover)
 *   variant="sub"     → small sub-row inside a group's CollapsibleContent
 *   variant="top"     → full-size row (Favorites / Recent / un-grouped)
 *
 * Star toggle (favorite) only shows on hover when expanded — keeps the
 * row visually clean while still discoverable.
 */
export function NavItem({
    item,
    variant,
    collapsed,
    tone = "default",
    activeAppearance = "soft",
    favorite,
    onRemove,
}: NavItemProps) {
    const Icon = item.icon;
    // Secondary tone gives a soft chip-like surface so a section (Recent)
    // visually reads as a separate cluster from the default-tone module
    // groups beneath it. We don't apply this to active items because the
    // primary active state takes precedence.
    const toneClass =
        tone === "secondary" && !item.isActive
            ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            : "";
    const activeClass = ACTIVE_CLASSES[activeAppearance];

    if (collapsed) {
        // Collapsed icon-only mode intentionally keeps the SOLID primary
        // fill regardless of `activeAppearance`. At 32px without any
        // text label, the soft tint reads as "subtle background tweak"
        // rather than "selected" — solid is the only visually
        // unambiguous indicator here.
        return (
            <SidebarMenuItem className="flex justify-center">
                <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={item.isActive}
                    className="
                        !p-0 flex items-center justify-center
                        data-[active=true]:!bg-primary
                        data-[active=true]:!text-primary-foreground
                    "
                >
                    <Link
                        to={item.url}
                        className="relative flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors"
                    >
                        <Icon className="h-5 w-5" />
                        {item.badge !== undefined && (
                            <span className="absolute -top-0.5 -right-0.5 inline-flex h-2 w-2 rounded-full bg-destructive ring-2 ring-sidebar" />
                        )}
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    const renderInner = (active?: boolean) => (
        <Link to={item.url} className="flex items-center gap-2 w-full min-w-0">
            <Icon
                className={cn(
                    "h-4 w-4 shrink-0",
                    // Icon color follows the active appearance:
                    //   soft  → primary tint (matches the soft text)
                    //   solid → primary-foreground (against the bold fill)
                    active &&
                        (activeAppearance === "soft"
                            ? "text-primary"
                            : "text-primary-foreground"),
                )}
            />
            <span className="flex-1 truncate">{item.title}</span>
            {item.badge !== undefined && (
                <Badge
                    className={cn(
                        "h-4 min-w-4 px-1 text-[10px] rounded-full",
                        badgeVariantToClass(item.badge.variant),
                    )}
                >
                    {item.badge.label}
                </Badge>
            )}
            {favorite && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        favorite.onToggle();
                    }}
                    aria-label={favorite.isFavorite ? "Unpin" : "Pin"}
                    title={favorite.isFavorite ? "Bỏ pin" : "Pin"}
                    className={cn(
                        "shrink-0 p-0.5 rounded transition-all hover:bg-muted",
                        favorite.isFavorite
                            ? "text-primary opacity-100"
                            : "text-muted-foreground/50 opacity-0 group-hover/navitem:opacity-100 hover:text-primary",
                    )}
                >
                    {/* Rotate 45° + fill khi đã pin → visual "stuck in"
                        rõ ràng. Khi chưa pin: icon outline, hover-reveal. */}
                    <Pin
                        size={12}
                        className={cn(
                            "transition-transform",
                            favorite.isFavorite && "rotate-45 fill-current",
                        )}
                    />
                </button>
            )}
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onRemove.onRemove();
                    }}
                    aria-label={onRemove.tooltip ?? "Remove"}
                    title={onRemove.tooltip ?? "Remove"}
                    /* Always visible — X is an explicit destructive action,
                       opacity-0 hover-reveal would make it look optional and
                       hide the user's intent to manage the list. */
                    className="shrink-0 p-0.5 rounded text-muted-foreground/70 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                >
                    <X size={12} />
                </button>
            )}
        </Link>
    );

    if (variant === "sub") {
        return (
            <SidebarMenuSubItem className="group/navitem">
                <SidebarMenuSubButton
                    asChild
                    isActive={item.isActive}
                    className={cn("group", activeClass, toneClass)}
                >
                    {renderInner(item.isActive)}
                </SidebarMenuSubButton>
            </SidebarMenuSubItem>
        );
    }

    return (
        <SidebarMenuItem className="group/navitem">
            <SidebarMenuButton
                asChild
                isActive={item.isActive}
                tooltip={item.title}
                className={cn(activeClass, toneClass)}
            >
                {renderInner(item.isActive)}
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}
