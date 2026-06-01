import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import { usePublicModules } from "@/hooks/usePublicModules";

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

interface GuestLayoutProps {
    children: React.ReactNode;
}

/**
 * Landing-style header + footer for **unauthenticated visitors only**.
 * Authenticated users (admin, student, teacher) get the sidebar shell
 * via `AppShell` in MainLayout — no longer use this layout.
 *
 *   ┌──────────────────────────────────────────────────────────────┐
 *   │ [☰] [Logo] [── public nav ──]              [actions row]     │ sticky
 *   ├──────────────────────────────────────────────────────────────┤
 *   │                                                              │
 *   │                     {children}                               │ main
 *   │                                                              │
 *   ├──────────────────────────────────────────────────────────────┤
 *   │ © 2026 Gengo                  Powered by Spring + React      │ footer
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Nav content is just the public (no-auth) module list — anything
 * permission-gated lives behind login and shows up in the sidebar
 * after authentication.
 */
export function GuestLayout({ children }: GuestLayoutProps) {
    const location = useLocation();
    const isAuthPage = AUTH_PATHS.has(location.pathname);

    const { data: publicModules = [] } = usePublicModules();

    const publicItems: GuestNavItem[] = publicModules
        .filter((m) => !!m.url)
        .map((m) => ({
            id: String(m.id ?? m.url ?? ""),
            url: m.url as string,
            title: m.title ?? m.url ?? "",
            icon: m.icon,
        }));

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
                            publicItems={publicItems}
                            currentPath={location.pathname}
                        />
                    )}

                    <GuestLogo />

                    {!isAuthPage && (
                        <GuestNavLinks
                            publicItems={publicItems}
                            currentPath={location.pathname}
                        />
                    )}

                    <div className="flex-1" />

                    <GuestActionsRow isAuthPage={isAuthPage} />
                </div>
            </header>

            <main className="flex-1 flex flex-col">{children}</main>

            <footer className="border-t bg-muted/30 py-6 mt-auto">
                <div className="w-full px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>© {new Date().getFullYear()} Gengo</span>
                    <span className="text-xs">
                        Powered by Spring Boot + React
                    </span>
                </div>
            </footer>
        </div>
    );
}
