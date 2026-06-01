import { useCallback, useEffect, useState } from "react";

import {
    COLOR_PRESETS,
    DEFAULT_COLOR_PRESET,
    PRESET_VAR_NAMES,
    findColorPreset,
    type ColorPreset,
    type ColorPresetId,
} from "@/lib/color-presets";
import { playThemeTransition } from "@/lib/theme-transition";

const STORAGE_KEY = "colorPreset";

function readStored(): ColorPresetId {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && COLOR_PRESETS.some((p) => p.id === raw)) {
            return raw as ColorPresetId;
        }
    } catch {
        // localStorage disabled — silent
    }
    return DEFAULT_COLOR_PRESET;
}

/** Push the preset's CSS vars (light or dark variant) onto `<html>`. */
function applyPresetVars(presetId: ColorPresetId, isDark: boolean): void {
    const preset = findColorPreset(presetId);
    const vars = isDark ? preset.dark : preset.light;
    const root = document.documentElement.style;
    for (const cssVar of PRESET_VAR_NAMES) {
        const value = vars[cssVar];
        if (value !== undefined) root.setProperty(cssVar, value);
    }
}

const isDarkNow = () =>
    document.documentElement.classList.contains("dark");

/**
 * Single source of truth for the active color preset.
 *
 * Behaviour:
 *   - On mount, hydrates from localStorage; falls back to the default
 *     preset for first-time visitors.
 *   - Re-applies the preset's CSS vars whenever the preset *or* the
 *     resolved theme (light/dark) changes — so flipping theme mode
 *     keeps the chosen palette but swaps to its dark / light variant.
 *   - Persists to localStorage on change + syncs across tabs via the
 *     `storage` event.
 *
 * One instance should be mounted at the layout root (MainLayout) so
 * the CSS vars apply globally for every page.
 */
export function useColorPreset() {
    const [presetId, setPresetIdState] = useState<ColorPresetId>(() =>
        readStored(),
    );

    // Apply CSS vars whenever the preset changes (reads the live dark state
    // off <html>). Every var in PRESET_VAR_NAMES (background, card, muted,
    // accent, sidebar, primary, ring, etc.) gets overwritten so the chrome
    // harmonizes with the chosen accent color — not just the primary.
    useEffect(() => {
        applyPresetVars(presetId, isDarkNow());
    }, [presetId]);

    // Re-apply on theme flips by watching the `.dark` class on <html>.
    // Theme state ISN'T shared across `useThemePreference` instances within
    // a tab (same-tab `localStorage` writes don't fire `storage`), so relying
    // on a sibling hook's `resolvedTheme` left the palette stale after a theme
    // switch — the user had to re-pick a color. Observing the class instead
    // catches every theme change regardless of which component triggered it.
    useEffect(() => {
        const root = document.documentElement;
        const observer = new MutationObserver(() => {
            applyPresetVars(presetId, root.classList.contains("dark"));
        });
        observer.observe(root, {
            attributes: true,
            attributeFilter: ["class"],
        });
        return () => observer.disconnect();
    }, [presetId]);

    // Cross-tab sync.
    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== STORAGE_KEY) return;
            if (e.newValue && COLOR_PRESETS.some((p) => p.id === e.newValue)) {
                setPresetIdState(e.newValue as ColorPresetId);
            }
        };
        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const setPreset = useCallback((next: ColorPresetId) => {
        playThemeTransition();
        setPresetIdState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // silent
        }
    }, []);

    const preset: ColorPreset = findColorPreset(presetId);
    return { presetId, preset, setPreset, presets: COLOR_PRESETS };
}
