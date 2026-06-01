import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";

import { profileApi } from "@/api/features/profile.api";
import { logger } from "@/lib/logger";
import { playThemeTransition } from "@/lib/theme-transition";
import { setTheme as setThemeAction } from "@/store/slices/auth/authSlice";
import type { RootState } from "@/store/store";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";
const THEME_PREFERENCE_KEY = "themePreference";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

const isThemePreference = (v: unknown): v is ThemePreference =>
    v === "dark" || v === "light" || v === "system";

function getStoredThemePreference(): ThemePreference {
    // Auth-synced key (themePreference) wins over the anonymous "theme"
    // key so BE → FE on login/refresh stays authoritative.
    const synced = localStorage.getItem(THEME_PREFERENCE_KEY);
    if (isThemePreference(synced)) return synced;
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(stored)) return stored;
    return "system";
}

function getSystemTheme(): ResolvedTheme {
    return window.matchMedia(SYSTEM_THEME_QUERY).matches ? "dark" : "light";
}

function applyThemeToDocument(theme: ResolvedTheme): void {
    const root = document.documentElement;
    const isDark = theme === "dark";
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
}

function resolveTheme(
    preference: ThemePreference,
    systemTheme: ResolvedTheme,
): ResolvedTheme {
    return preference === "system" ? systemTheme : preference;
}

/**
 * Single source of truth for the theme preference + applied document
 * theme. Used by `<ToggleTheme>` and by the user dropdown's inline
 * theme radio items, so the two stay in lockstep with one set of
 * side-effects (document class, localStorage, Redux, BE sync).
 *
 * Side effects owned here:
 *   - Reflect the resolved theme onto `<html>` (class + color-scheme).
 *   - Mirror preference into both legacy + new localStorage keys so the
 *     early-boot script in main.tsx that reads "theme" stays consistent.
 *   - PATCH the user's profile on the BE when authenticated (debounced
 *     via `lastSyncedRef` to avoid PATCH echo loops when BE responses
 *     refresh our state with the same value).
 *   - Listen for OS theme changes via `matchMedia` so a "system" pref
 *     re-resolves live without a reload.
 *   - Listen for cross-tab `storage` events so toggling in one tab
 *     updates every open tab.
 *
 * Returned values:
 *   - `themePreference`  user's choice (may be "system")
 *   - `resolvedTheme`    what's actually rendered (always light/dark)
 *   - `systemTheme`      current OS preference
 *   - `setThemePreference`  setter that triggers all sync side effects
 *   - `isDark`           convenience flag for icon swapping
 */
export function useThemePreference() {
    const dispatch = useDispatch();
    const { isAuthenticated, theme: authTheme } = useSelector(
        (state: RootState) => state.auth,
    );

    const [themePreference, setThemePreferenceState] =
        useState<ThemePreference>(() => getStoredThemePreference());
    const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
        getSystemTheme(),
    );

    // Tracks the value last pushed to the BE so we don't PATCH-after-PATCH
    // when the BE response refreshes our Redux state with the same value.
    const lastSyncedRef = useRef<ThemePreference | null>(null);

    // BE → FE: adopt the auth-synced theme on login / refresh.
    useEffect(() => {
        if (!isAuthenticated) return;
        if (!isThemePreference(authTheme)) return;
        if (authTheme === themePreference) return;
        setThemePreferenceState(authTheme);
        lastSyncedRef.current = authTheme;
    }, [isAuthenticated, authTheme, themePreference]);

    const resolvedTheme = useMemo(
        () => resolveTheme(themePreference, systemTheme),
        [themePreference, systemTheme],
    );
    const isDark = resolvedTheme === "dark";

    // Apply to <html>.
    useEffect(() => {
        applyThemeToDocument(resolvedTheme);
    }, [resolvedTheme]);

    // Mirror to both localStorage keys.
    useEffect(() => {
        localStorage.setItem(THEME_STORAGE_KEY, themePreference);
        localStorage.setItem(THEME_PREFERENCE_KEY, themePreference);
    }, [themePreference]);

    // Cross-tab sync.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== THEME_STORAGE_KEY) return;
            if (isThemePreference(e.newValue)) {
                setThemePreferenceState(e.newValue);
            } else if (e.newValue === null) {
                setThemePreferenceState("system");
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    // OS theme listener.
    useEffect(() => {
        const mq = window.matchMedia(SYSTEM_THEME_QUERY);
        const update = () => setSystemTheme(mq.matches ? "dark" : "light");
        update();
        if (typeof mq.addEventListener === "function") {
            mq.addEventListener("change", update);
            return () => mq.removeEventListener("change", update);
        }
        // Legacy Safari API
        mq.addListener(update);
        return () => mq.removeListener(update);
    }, []);

    const setThemePreference = useCallback(
        (next: ThemePreference) => {
            if (next === themePreference) return;
            playThemeTransition();
            setThemePreferenceState(next);
            if (isAuthenticated && lastSyncedRef.current !== next) {
                lastSyncedRef.current = next;
                dispatch(setThemeAction(next));
                profileApi.updateTheme({ theme: next }).catch((err) => {
                    lastSyncedRef.current = null;
                    logger.warn("Failed to persist theme to profile", err);
                });
            }
        },
        [themePreference, isAuthenticated, dispatch],
    );

    return {
        themePreference,
        resolvedTheme,
        systemTheme,
        isDark,
        setThemePreference,
    };
}
