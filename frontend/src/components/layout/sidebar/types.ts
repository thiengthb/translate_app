import type { LucideIcon } from "lucide-react";

/**
 * Visual badge that can hang off a sidebar item — e.g. unread count,
 * "NEW" pill, "BETA" tag. Data source is up to the caller; the sidebar
 * just renders it.
 */
export interface SidebarBadge {
    /** Text to show inside the badge. Numbers render as count badges. */
    label: string | number;
    /** Visual treatment. Default = "secondary". */
    variant?: "default" | "secondary" | "destructive" | "outline";
}

export interface SidebarNavItem {
    /** Stable key (usually = url) — used for favorites/recent persistence. */
    key: string;
    title: string;
    url: string;
    icon: LucideIcon;
    isActive?: boolean;
    badge?: SidebarBadge;
}

export interface SidebarNavGroup {
    id: string;
    name: string;
    items: SidebarNavItem[];
}
