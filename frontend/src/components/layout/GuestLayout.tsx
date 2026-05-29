import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import { useActiveModuleGroups } from "@/hooks/useSidebarMenus";
import { usePublicModules } from "@/hooks/usePublicModules";
import { ADMIN_ROLE, normalizeRole } from "@/utils/rbac.utils";
import type { RootState } from "@/store/store";

import { GuestActionsRow } from "./guest/GuestActionsRow";
import { GuestLogo } from "./guest/GuestLogo";
import { GuestMobileMenu } from "./guest/GuestMobileMenu";
import { GuestNavLinks, type GuestNavItem } from "./guest/GuestNavLinks";

/** Pages where the navbar should hide its menu/auth CTAs entirely. */
const AUTH_PATHS = new Set([
    "/login",
    "/register",
    "/forgot-password",
    "/check-email",
    "/unauthorized",
    "/not-found-page",
]);

/**
 * Defensive belt for groups that should never appear in a non-admin
 * user's navbar even if their entity permissions accidentally leak in.
 * The system menu (Module / ModuleGroup) is now gated by `MENU_UPDATE`
 * at the BE so the permission filter excludes it on its own — kept here
 * for future entities that happen to share these group names.
 */
const ADMIN_ONLY_GROUP_NAMES = new Set(["rbac management", "dashboard"]);
const isAdminOnlyGroup = (name?: string | null): boolean =>
    !!name && ADMIN_ONLY_GROUP_NAMES.has(name.trim().toLowerCase());

/**
 * Header + footer shell for everyone who isn't in the admin sidebar
 * shell — guests, students, teachers, and any auth-flow pages.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [☰] [Logo] [── desktop nav ──]    [actions row]    [User]    │ sticky header
 *   ├──────────────────────────────────────────────────────────────┤
 *   │                                                              │
 *   │                     {children}                               │ main
 *   │                                                              │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ © 2026 RBAC System            Powered by Spring + React      │ footer
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Responsibilities at this level:
 *   - decide which nav variant to render (public flat vs module groups)
 *   - compose Logo + Nav + MobileMenu + Actions in a sticky `<header>`
 *   - render scroll-aware shadow when the page is scrolled
 *
 * Everything else (logo link, action collapse, mobile menu drawer,
 * search filter) lives in the sub-components in `./guest/`.
 */
interface GuestLayoutProps {
    children: React.ReactNode;
    /** Forwarded into the authenticated user's avatar dropdown so its
     *  "Phím tắt" entry opens the same global dialog the admin shell uses. */
    onOpenShortcuts?: () => void;
}

export function GuestLayout({ children, onOpenShortcuts }: GuestLayoutProps) {
    const location = useLocation();
    const { isAuthenticated, role } = useSelector(
        (state: RootState) => state.auth,
    );
    const isAdmin = normalizeRole(role) === ADMIN_ROLE;
    const isAuthPage = AUTH_PATHS.has(location.pathname);

    const { data: publicModules = [] } = usePublicModules();
    // Only fetch personal module groups for non-admin auth users — admin
    // has the sidebar already.
    const { data: moduleGroups = [] } = useActiveModuleGroups(
        isAuthenticated && !isAdmin,
    );

    // Layout decisions:
    //   - non-admin authenticated user  → module group dropdowns
    //     (their accessible modules already include the public ones, so
    //     we skip the flat public list).
    //   - guest / admin browsing public → flat list of public modules.
    const showModuleGroups = isAuthenticated && !isAdmin && !isAuthPage;
    const showPublicFlat = !showModuleGroups && !isAuthPage;

    const publicItems: GuestNavItem[] = publicModules
        .filter((m) => !!m.url)
        .map((m) => ({
            id: String(m.id ?? m.url ?? ""),
            url: m.url as string,
            title: m.title ?? m.url ?? "",
            icon: m.icon,
        }));

    const visibleModuleGroups = showModuleGroups
        ? moduleGroups.filter((g) => !isAdminOnlyGroup(g.name))
        : [];

    // Scroll-aware shadow: subtle border-bottom shadow appears after the
    // user has scrolled past the header threshold. Replaces the always-on
    // hard border for a softer "lifted" look while the user is reading.
    const [isScrolled, setIsScrolled] = useState(false);
    useEffect(() => {
        const onScroll = () => setIsScrolled(window.scrollY > 4);
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return (
        <div className="min-h-screen flex flex-col bg-background">
            <header
                className={
                    "sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-xl transition-shadow " +
                    (isScrolled
                        ? "shadow-sm border-border"
                        : "border-transparent")
                }
            >
                <div className="w-full flex h-16 items-center gap-2 sm:gap-4 px-3 sm:px-6 lg:px-8">
                    {!isAuthPage && (
                        <GuestMobileMenu
                            publicItems={showPublicFlat ? publicItems : []}
                            moduleGroups={
                                showModuleGroups ? visibleModuleGroups : []
                            }
                            currentPath={location.pathname}
                        />
                    )}

                    <GuestLogo />

                    {!isAuthPage && (
                        <GuestNavLinks
                            publicItems={showPublicFlat ? publicItems : []}
                            moduleGroups={
                                showModuleGroups ? visibleModuleGroups : []
                            }
                            currentPath={location.pathname}
                        />
                    )}

                    <div className="flex-1" />

                    <GuestActionsRow
                        isAuthPage={isAuthPage}
                        onOpenShortcuts={onOpenShortcuts}
                    />
                </div>
            </header>

            <main className="flex-1 flex flex-col">{children}</main>

            <footer className="border-t bg-muted/30 py-6 mt-auto">
                <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>© {new Date().getFullYear()} RBAC System</span>
                    <span className="text-xs">
                        Powered by Spring Boot + React
                    </span>
                </div>
            </footer>
        </div>
    );
}
