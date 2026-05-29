import { useCallback, useEffect, useState } from "react";

import {
    COLOR_PRESETS,
    DEFAULT_COLOR_PRESET,
    PRESET_VAR_NAMES,
    findColorPreset,
    type ColorPreset,
    type ColorPresetId,
} from "@/lib/color-presets";
import { useThemePreference } from "@/hooks/useThemePreference";

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
    const { resolvedTheme } = useThemePreference();
    const [presetId, setPresetIdState] = useState<ColorPresetId>(() =>
        readStored(),
    );

    // Apply CSS vars whenever preset or resolved theme changes. Every
    // var in PRESET_VAR_NAMES (background, card, muted, accent, sidebar,
    // primary, ring, etc.) gets overwritten so the chrome harmonizes
    // with the chosen accent color — not just the primary.
    useEffect(() => {
        const preset = findColorPreset(presetId);
        const vars =
            resolvedTheme === "dark" ? preset.dark : preset.light;
        const root = document.documentElement.style;
        for (const cssVar of PRESET_VAR_NAMES) {
            const value = vars[cssVar];
            if (value !== undefined) root.setProperty(cssVar, value);
        }
    }, [presetId, resolvedTheme]);

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
