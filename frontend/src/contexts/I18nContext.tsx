import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import { useDispatch, useSelector } from "react-redux";

import {
    DEFAULT_LOCALE,
    LOCALES,
    MESSAGES,
    isLocale,
    type Locale,
    type LocaleOption,
    type MessageKey,
} from "@/i18n";
import { profileApi } from "@/api/features/profile.api";
import { setLocale as setLocaleAction } from "@/store/slices/auth/authSlice";
import { logger } from "@/lib/logger";
import type { RootState } from "@/store/store";

const STORAGE_KEY = "app-locale";

/** Parameter bag for placeholder interpolation — `t("key", { name: "..." })`. */
export type TranslationValues = Record<string, string | number>;

interface I18nContextValue {
    locale: Locale;
    setLocale: (next: Locale) => void;
    locales: readonly LocaleOption[];
    /**
     * Resolve a message key against the current catalog.
     * - Falls back to the English value if a key is missing from the active
     *   locale (defensive — TS already prevents this, but runtime catalogs
     *   loaded from outside the bundle would skip the check).
     * - Falls back to the key itself if both are missing.
     * - Substitutes `{name}` placeholders with values from `params`.
     */
    t: (key: MessageKey, params?: TranslationValues) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function loadInitialLocale(): Locale {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (isLocale(stored)) return stored;

    const browser =
        typeof navigator !== "undefined" ? navigator.language?.split("-")[0] : null;
    if (isLocale(browser)) return browser;

    return DEFAULT_LOCALE;
}

function interpolate(template: string, params?: TranslationValues): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name) => {
        const value = params[name];
        return value === undefined ? `{${name}}` : String(value);
    });
}

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(loadInitialLocale);

    const dispatch = useDispatch();
    const { isAuthenticated, locale: authLocale } = useSelector(
        (state: RootState) => state.auth,
    );

    // Tracks the locale we last pushed to the BE so we don't echo a value the
    // server just told us about (login response → setLocale here → PATCH back).
    const lastSyncedRef = useRef<Locale | null>(null);

    // Apply locale coming from the BE (login / refresh) when it differs.
    useEffect(() => {
        if (!isAuthenticated) return;
        if (!isLocale(authLocale)) return;
        if (authLocale === locale) return;
        setLocaleState(authLocale);
        lastSyncedRef.current = authLocale;
        try {
            localStorage.setItem(STORAGE_KEY, authLocale);
        } catch {
            /* ignore */
        }
    }, [isAuthenticated, authLocale, locale]);

    // Keep `<html lang>` in sync so screen readers + browser features know.
    useEffect(() => {
        if (typeof document !== "undefined") {
            document.documentElement.lang = locale;
        }
    }, [locale]);

    const setLocale = useCallback(
        (next: Locale) => {
            setLocaleState(next);
            try {
                localStorage.setItem(STORAGE_KEY, next);
            } catch {
                /* ignore quota / private-mode errors */
            }

            if (isAuthenticated && lastSyncedRef.current !== next) {
                lastSyncedRef.current = next;
                dispatch(setLocaleAction(next));
                profileApi.updateLocale({ locale: next }).catch((err) => {
                    // Roll back the "synced" marker so a retry can replay.
                    lastSyncedRef.current = null;
                    logger.warn("Failed to persist locale to profile", err);
                });
            }
        },
        [dispatch, isAuthenticated],
    );

    const t = useCallback(
        (key: MessageKey, params?: TranslationValues) => {
            const catalog = MESSAGES[locale] ?? MESSAGES[DEFAULT_LOCALE];
            const fallback = MESSAGES[DEFAULT_LOCALE];
            const template = catalog[key] ?? fallback[key] ?? key;
            return interpolate(template, params);
        },
        [locale],
    );

    const value = useMemo<I18nContextValue>(
        () => ({ locale, setLocale, locales: LOCALES, t }),
        [locale, setLocale, t],
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
    const ctx = useContext(I18nContext);
    if (!ctx) {
        throw new Error("useTranslation must be used inside <I18nProvider>");
    }
    return ctx;
}

// Backwards-compatible alias for older call sites.
export const useI18n = useTranslation;
