import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { iconMap } from "@/components/datatable/iconMap";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus.ts";
import { cn } from "@/lib/utils";

type Props = {
    pathTitles?: Record<string, string>;
    /** When true (default), the last segment renders as the current page
     *  (non-clickable). When false, all segments are clickable links. */
    hasPage?: boolean;
    /** Path segments to drop from the crumb trail entirely. */
    ignorePaths?: string[];
};

function formatPath(path: string) {
    return path
        .replace(/-/g, " ")
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Top-bar breadcrumb.
 *
 *   [🏠] › Parent › Người dùng
 *    └─ home icon          └─ current page (font-medium, no link)
 *                              + active module's icon when matched
 *
 * Design choices:
 *   - Compact `text-sm` throughout — fits an h-14/h-16 top bar without
 *     looking like a page title (previously the last item was
 *     `text-2xl font-bold` which dwarfed the rest of the chrome).
 *   - Leading home-icon button anchors users back to `/`.
 *   - Active module's icon precedes its label — a glance tells you
 *     which page you're on without reading.
 *   - `ChevronRight` separator (lucide) — visual chevron reads cleaner
 *     than the literal `>` character at small sizes.
 *   - Hover background on parent links so the click targets read
 *     clearly mid-scroll.
 */
export default function DynamicBreadcrumbs({
    pathTitles,
    hasPage = true,
    ignorePaths = [],
}: Props) {
    const location = useLocation();
    const { data: moduleGroups } = useActiveModuleGroups();

    const ignoreSet = useMemo(
        () => new Set(ignorePaths.map((p) => p.toLowerCase())),
        [ignorePaths],
    );

    const paths = useMemo(
        () =>
            location.pathname
                .split("/")
                .filter(Boolean)
                .filter((p) => !ignoreSet.has(p.toLowerCase())),
        [location.pathname, ignoreSet],
    );

    const activeModule = useMemo(
        () =>
            moduleGroups
                ?.flatMap((group) => group.modules)
                ?.find((module) => module.url === location.pathname),
        [moduleGroups, location.pathname],
    );

    const ModuleIcon = useMemo(() => {
        const key =
            activeModule?.icon && activeModule.icon in iconMap
                ? (activeModule.icon as keyof typeof iconMap)
                : null;
        return key ? iconMap[key] : null;
    }, [activeModule]);

    // Empty path (root) → just the home icon.
    if (paths.length === 0) {
        return (
            <Breadcrumb>
                <BreadcrumbList className="text-sm gap-1.5">
                    <BreadcrumbItem>
                        <HomeLink />
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
        );
    }

    return (
        <Breadcrumb>
            <BreadcrumbList className="text-sm gap-1.5 flex-nowrap">
                {/* Always show home as the first anchor. */}
                <BreadcrumbItem>
                    <HomeLink />
                </BreadcrumbItem>

                {paths.map((segment, index) => {
                    const href = "/" + paths.slice(0, index + 1).join("/");
                    const isLast = index === paths.length - 1;
                    const title =
                        pathTitles?.[href] ??
                        pathTitles?.[segment] ??
                        formatPath(segment);

                    return (
                        <BreadcrumbItem
                            key={href}
                            className="flex items-center gap-1.5"
                        >
                            <BreadcrumbSeparator className="text-muted-foreground/50">
                                <ChevronRight className="size-3.5" />
                            </BreadcrumbSeparator>

                            {isLast && hasPage ? (
                                <span className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md">
                                    {ModuleIcon && (
                                        <ModuleIcon
                                            className="size-4 text-primary shrink-0"
                                            aria-hidden
                                        />
                                    )}
                                    <BreadcrumbPage className="text-foreground font-medium truncate">
                                        {title}
                                    </BreadcrumbPage>
                                </span>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link
                                        to={href}
                                        className={cn(
                                            "px-1.5 py-0.5 rounded-md text-muted-foreground",
                                            "hover:text-foreground hover:bg-accent/70 transition-colors",
                                        )}
                                    >
                                        {title}
                                    </Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                    );
                })}
            </BreadcrumbList>
        </Breadcrumb>
    );
}

// ─── Home anchor link ───────────────────────────────────────────────────────
function HomeLink() {
    return (
        <BreadcrumbLink asChild>
            <Link
                to="/"
                aria-label="Trang chủ"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/70 transition-colors"
            >
                <Home className="size-4" />
            </Link>
        </BreadcrumbLink>
    );
}
