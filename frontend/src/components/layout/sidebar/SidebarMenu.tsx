import { Fragment, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { ChevronsDownUp, ChevronsUpDown, Search as SearchIcon } from "lucide-react";

import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Button } from "@/components/ui/button";

import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarMenu as SidebarMenuList,
    SidebarSeparator,
    useSidebar,
} from "@/components/ui/sidebar";

import { iconMap } from "@/components/datatable/iconMap";
import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";

import { NavGroup } from "./NavGroup";
import { NavItem } from "./NavItem";
import { KanjiBrandIcon } from "@/pages/kanji-study/components/KanjiBrandIcon";
import { PinnedSection } from "./PinnedSection";
import { RecentSection } from "./RecentSection";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { SidebarBranding } from "./SidebarBranding";
import { SidebarSearch } from "./SidebarSearch";
import { SidebarSettings } from "./SidebarSettings";
import type { LucideIcon } from "lucide-react";
import type { SidebarNavGroup, SidebarNavItem } from "./types";

/** Entry point of the self-contained Kanji-study area. */
const KANJI_HOME = "/kanji-study";
/**
 * Every kanji-feature module URL — both the study area (`/kanji-study…`) and
 * the per-entity CRUD admin pages (`/kanji-radicals`, `/kanji-decks`,
 * `/kanji-details`, `/kanji-readings`, `/kanji-reading-sets`, …). All of
 * them are collapsed out of the regular sidebar into a single 漢 launcher
 * that opens the feature's own in-page nav.
 */
const isKanjiUrl = (url?: string) => !!url && url.startsWith("/kanji-");

import { useFilteredNavGroups } from "./hooks/useFilteredNavGroups";
import { useGroupCollapseState } from "./hooks/useGroupCollapseState";
import { useSidebarFavorites } from "./hooks/useSidebarFavorites";
import { useSidebarPreferences } from "./hooks/useSidebarPreferences";
import { useSidebarRecent } from "./hooks/useSidebarRecent";

/**
 * Admin sidebar (shadcn-based). Owns the read of all modules and
 * orchestrates: branding, search filter, favorites, recent, module
 * groups, footer.
 *
 *   ┌──────────────────────────┐
 *   │ [Logo] RBAC System       │ ← branding (click to toggle)
 *   ├──────────────────────────┤
 *   │ 🔎 Tìm trong menu…  /   │ ← inline filter (expanded only)
 *   ├──────────────────────────┤
 *   │ ★ Yêu thích              │ ← if any pinned
 *   │ ⏱ Gần đây                │ ← MRU
 *   │ ── Group 1 ──            │ ← module groups (collapsible)
 *   │ ── Group 2 ──            │
 *   ├──────────────────────────┤
 *   │ [Avatar] User  🌗 ⟨      │ ← footer
 *   └──────────────────────────┘
 */
export function SidebarMenu() {
    const location = useLocation();
    const { state } = useSidebar();
    const isCollapsed = state !== "expanded";

    const { data: moduleGroups = [] } = useActiveModuleGroups();
    const { preferences, setPreference } = useSidebarPreferences();
    const { isFavorite, toggle: toggleFavorite } = useSidebarFavorites();
    const {
        isOpen: isGroupOpen,
        setOpen: setGroupOpen,
        setAll: setAllGroups,
    } = useGroupCollapseState();
    const [searchQuery, setSearchQuery] = useState("");

    // ─── Build nav groups from API + iconMap ────────────────────────────────
    const navGroups = useMemo<SidebarNavGroup[]>(() => {
        const resolveIcon = (iconName?: string) => {
            const key: keyof typeof iconMap =
                iconName && iconName in iconMap
                    ? (iconName as keyof typeof iconMap)
                    : "menu";
            return iconMap[key];
        };

        return moduleGroups
            .map((group) => ({
                id: String(group.id ?? group.name ?? "group"),
                name: group.name ?? "Menu",
                items: group.modules
                    // Kanji-study modules are surfaced via the dedicated 漢
                    // launcher (below), not as regular sidebar rows.
                    .filter((m) => !!m.url && !isKanjiUrl(m.url))
                    .map<SidebarNavItem>((m) => ({
                        key: m.url ?? "",
                        title: m.title ?? "Untitled",
                        url: m.url ?? "#",
                        icon: resolveIcon(m.icon),
                        isActive:
                            !!m.url &&
                            (location.pathname === m.url ||
                                location.pathname.startsWith(`${m.url}/`)),
                    })),
            }))
            .filter((g) => g.items.length > 0);
    }, [location.pathname, moduleGroups]);

    // ─── Kanji-study launcher ───────────────────────────────────────────────
    // Shown only if the user actually has a kanji module (permission-gated by
    // the BE). A single 漢 row that opens the feature's own sidebar-less area.
    const kanjiLauncher = useMemo<SidebarNavItem | null>(() => {
        const hasKanji = moduleGroups.some((g) =>
            g.modules.some((m) => isKanjiUrl(m.url)),
        );
        if (!hasKanji) return null;
        return {
            key: KANJI_HOME,
            title: "Kanji Study",
            url: KANJI_HOME,
            icon: KanjiBrandIcon as unknown as LucideIcon,
            isActive: location.pathname.startsWith(KANJI_HOME),
        };
    }, [moduleGroups, location.pathname]);

    // ─── Derived: flat lookup tables for favorites / recent ─────────────────
    const itemByKey = useMemo(() => {
        const map = new Map<string, SidebarNavItem>();
        for (const g of navGroups) for (const item of g.items) map.set(item.key, item);
        return map;
    }, [navGroups]);

    const knownUrls = useMemo(
        () => new Set(Array.from(itemByKey.keys())),
        [itemByKey],
    );
    const {
        recent,
        removeItem: removeRecentItem,
        clearAll: clearRecentAll,
    } = useSidebarRecent({ knownUrls });

    const favoriteItems = useMemo(() => {
        // Re-read from itemByKey so favorites stay in sync with the latest
        // active-state. Drop favorites whose source module disappeared.
        const list: SidebarNavItem[] = [];
        for (const key of itemByKey.keys()) {
            if (isFavorite(key)) list.push(itemByKey.get(key)!);
        }
        return list;
    }, [itemByKey, isFavorite]);

    const recentItems = useMemo(() => {
        return recent
            .map((url) => itemByKey.get(url))
            .filter((i): i is SidebarNavItem => !!i)
            .filter((i) => !isFavorite(i.key)); // de-dupe with Favorites
    }, [recent, itemByKey, isFavorite]);

    // ─── Search filter ──────────────────────────────────────────────────────
    const filteredGroups = useFilteredNavGroups(navGroups, searchQuery);
    const hasSearchResults = filteredGroups.length > 0;
    const isSearching = searchQuery.trim().length > 0;

    // While searching, hide Favorites / Recent — the user is looking up
    // something specific and shouldn't have to skim other sections.
    const showSecondarySections = !isSearching;

    const favoriteFor = (key: string) => ({
        isFavorite: isFavorite(key),
        onToggle: () => toggleFavorite(key),
    });

    return (
        <Sidebar variant="inset" collapsible="icon">
            <SidebarBranding />

            <SidebarContent className="overflow-y-hidden">
                {/* Search stays pinned ABOVE the scrolling viewport so users
                    can always reach the filter, even when scrolled deep into
                    a long group list. */}
                <SidebarSearch
                    value={searchQuery}
                    onChange={setSearchQuery}
                    actions={
                        navGroups.length > 0 && (() => {
                            // Toggle reflects the OTHER state — if every
                            // group is currently open, the button shows
                            // "collapse" (the next action); otherwise it
                            // shows "expand". Matches the convention used
                            // by VSCode's outline toggle.
                            const allOpen = navGroups.every((g) =>
                                isGroupOpen(g.name),
                            );
                            const nextLabel = allOpen
                                ? "Thu gọn tất cả nhóm"
                                : "Mở tất cả nhóm";
                            const Icon = allOpen
                                ? ChevronsDownUp
                                : ChevronsUpDown;
                            return (
                                <TooltipWrapper content={nextLabel}>
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="icon"
                                        onClick={() =>
                                            setAllGroups(
                                                navGroups.map((g) => g.name),
                                                !allOpen,
                                            )
                                        }
                                        aria-label={nextLabel}
                                        className="shrink-0 h-7 w-7"
                                    >
                                        <Icon size={14} />
                                    </Button>
                                </TooltipWrapper>
                            );
                        })()
                    }
                />

                <ScrollHintContainer>
                    {!isSearching && kanjiLauncher && (
                        <>
                            <SidebarGroup className="py-1 group-data-[collapsible=icon]:px-0">
                                <SidebarMenuList>
                                    <NavItem
                                        item={kanjiLauncher}
                                        variant="top"
                                        collapsed={isCollapsed}
                                        activeAppearance={isCollapsed ? "solid" : "soft"}
                                    />
                                </SidebarMenuList>
                            </SidebarGroup>
                            {!isCollapsed && <SidebarSeparator className="mx-2 my-1" />}
                        </>
                    )}

                    {showSecondarySections &&
                        preferences.showPinned &&
                        favoriteItems.length > 0 && (
                            <>
                                <PinnedSection
                                    items={favoriteItems}
                                    favoriteFor={favoriteFor}
                                />
                                {!isCollapsed && (
                                    <SidebarSeparator className="mx-2 my-1" />
                                )}
                            </>
                        )}

                    {showSecondarySections &&
                        preferences.showRecent &&
                        recentItems.length > 0 && (
                            <>
                                <RecentSection
                                    items={recentItems}
                                    onRemoveItem={removeRecentItem}
                                    onClearAll={clearRecentAll}
                                />
                                {!isCollapsed && (
                                    <SidebarSeparator className="mx-2 my-1" />
                                )}
                            </>
                        )}

                    {isSearching && !hasSearchResults && !isCollapsed && (
                        <div className="px-4 py-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                            <SearchIcon size={20} className="opacity-40" />
                            Không tìm thấy “{searchQuery}”
                        </div>
                    )}

                    {filteredGroups.map((group, idx) => (
                        <Fragment key={group.id}>
                            {/* Inter-group separator. Placed OUTSIDE the
                                SidebarGroup wrapper so its `mx-2` margin
                                doesn't compound with the group's own
                                `px-2` padding — keeps the separator
                                aligned with sibling icons when the
                                sidebar is collapsed (48px wide). */}
                            {isCollapsed && idx > 0 && (
                                <SidebarSeparator className="mx-2 my-1" />
                            )}
                            <SidebarGroup className="py-1 group-data-[collapsible=icon]:px-0">
                                {/* `px-0` when collapsed: remove the
                                    horizontal padding so the icon
                                    buttons (32x32) sit centered in the
                                    full 48px sidebar width — otherwise
                                    the base `p-2` shrinks the inner
                                    area to 32px and the buttons fill
                                    edge-to-edge like rows. */}
                                {/* Note: no SidebarGroupLabel here —
                                    NavGroup's CollapsibleTrigger already
                                    renders the group name as a clickable
                                    header row. Showing both produced
                                    duplicate labels for single-item
                                    groups. */}
                                <SidebarMenuList>
                                    <NavGroup
                                        group={group}
                                        collapsed={isCollapsed}
                                        isOpen={isGroupOpen(group.name)}
                                        onOpenChange={(open) =>
                                            setGroupOpen(group.name, open)
                                        }
                                        favoriteFor={favoriteFor}
                                    />
                                </SidebarMenuList>
                            </SidebarGroup>
                        </Fragment>
                    ))}
                </ScrollHintContainer>
            </SidebarContent>

            <SidebarSettings
                preferences={preferences}
                setPreference={setPreference}
            />
        </Sidebar>
    );
}
