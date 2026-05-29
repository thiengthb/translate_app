import { useCallback, useEffect, useState } from "react";

import {
    DEFAULT_FONT_FAMILY,
    DEFAULT_FONT_SIZE,
    FONT_FAMILIES,
    FONT_SIZES,
    findFontFamily,
    findFontSize,
    type FontFamilyId,
    type FontSizeId,
} from "@/lib/typography-presets";

const FAMILY_KEY = "fontFamily";
const SIZE_KEY = "fontSize";
const LINK_PREFIX = "app-font-";

function readStoredFamily(): FontFamilyId {
    try {
        const raw = localStorage.getItem(FAMILY_KEY);
        if (raw && FONT_FAMILIES.some((f) => f.id === raw)) {
            return raw as FontFamilyId;
        }
    } catch {
        // localStorage disabled — silent
    }
    return DEFAULT_FONT_FAMILY;
}

function readStoredSize(): FontSizeId {
    try {
        const raw = localStorage.getItem(SIZE_KEY);
        if (raw && FONT_SIZES.some((s) => s.id === raw)) {
            return raw as FontSizeId;
        }
    } catch {
        // silent
    }
    return DEFAULT_FONT_SIZE;
}

/**
 * Inject (once) a Google Fonts `<link>` for the given preset. Idempotent
 * — repeated calls with the same id no-op so flipping back and forth
 * between presets doesn't accumulate stylesheets.
 */
function ensureFontLink(id: FontFamilyId, href: string | null): void {
    if (!href) return;
    const linkId = `${LINK_PREFIX}${id}`;
    if (document.getElementById(linkId)) return;
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
}

/**
 * Single source of truth for typography settings.
 *
 * Behaviour:
 *   - Mounts the active font family + size on `<html>` via CSS vars.
 *   - Lazy-loads the Google Fonts stylesheet the first time a web-font
 *     preset is selected (system stack skips the network entirely).
 *   - Persists to localStorage + syncs across tabs via the `storage`
 *     event so two windows stay in lockstep.
 *
 * Mounted at the layout root (MainLayout) so the vars apply globally
 * for every page.
 */
export function useTypography() {
    const [familyId, setFamilyIdState] = useState<FontFamilyId>(() =>
        readStoredFamily(),
    );
    const [sizeId, setSizeIdState] = useState<FontSizeId>(() => readStoredSize());

    // Apply font-family — including lazy-loading its stylesheet.
    useEffect(() => {
        const family = findFontFamily(familyId);
        ensureFontLink(family.id, family.href);
        document.documentElement.style.setProperty(
            "--font-sans",
            family.family,
        );
        // When the user picks the monospace face, mirror it onto
        // --font-mono so code-style elements also follow.
        if (family.id === "jetbrains") {
            document.documentElement.style.setProperty(
                "--font-mono",
                family.family,
            );
        }
    }, [familyId]);

    // Apply density.
    useEffect(() => {
        const size = findFontSize(sizeId);
        document.documentElement.style.setProperty(
            "--app-font-size",
            size.size,
        );
    }, [sizeId]);

    // Cross-tab sync.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key === FAMILY_KEY && e.newValue) {
                if (FONT_FAMILIES.some((f) => f.id === e.newValue)) {
                    setFamilyIdState(e.newValue as FontFamilyId);
                }
            } else if (e.key === SIZE_KEY && e.newValue) {
                if (FONT_SIZES.some((s) => s.id === e.newValue)) {
                    setSizeIdState(e.newValue as FontSizeId);
                }
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setFamily = useCallback((next: FontFamilyId) => {
        setFamilyIdState(next);
        try {
            localStorage.setItem(FAMILY_KEY, next);
        } catch {
            // silent
        }
    }, []);

    const setSize = useCallback((next: FontSizeId) => {
        setSizeIdState(next);
        try {
            localStorage.setItem(SIZE_KEY, next);
        } catch {
            // silent
        }
    }, []);

    return {
        familyId,
        sizeId,
        setFamily,
        setSize,
        families: FONT_FAMILIES,
        sizes: FONT_SIZES,
    };
}
