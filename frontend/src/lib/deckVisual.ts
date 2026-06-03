/**
 * Utilities to resolve the display icon + background color for a deck.
 *
 * Priority:
 *   1. deck.deckColor / deck.deckIcon  — user-chosen, stored in DB
 *   2. Fallback to deterministic color from COLOR_PRESETS (based on deck.id)
 *      and default icon "book-open"
 */
import { COLOR_PRESETS } from "@/lib/color-presets";
import { iconMap, type IconKey } from "@/components/datatable/iconMap";

const DEFAULT_ICON_KEY: IconKey = "book-open";

/** Sentinel + CSS for the "follow the app's accent color" option (the default). */
const APP_COLOR = "app";
const APP_COLOR_CSS = "var(--primary)";

/**
 * Returns the background color (CSS color string) for a deck.
 *
 * A deck that picked a named preset renders that preset's swatch. A deck with
 * no color, or the "app" sentinel, follows the app's themed accent
 * (`var(--primary)`) so it re-tints automatically when the user changes the
 * app's color preset.
 */
export function deckBgColor(deck: { id?: number; deckColor?: string }): string {
  if (deck.deckColor && deck.deckColor !== APP_COLOR) {
    const preset = COLOR_PRESETS.find((p) => p.id === deck.deckColor);
    if (preset) return preset.swatch;
  }
  return APP_COLOR_CSS;
}

/**
 * Returns the background as an inline React style object — use with `style={}`.
 */
export function deckBgStyle(deck: { id?: number; deckColor?: string }): React.CSSProperties {
  return { background: deckBgColor(deck) };
}

/**
 * Returns the Lucide icon component for a deck.
 * Uses the user-chosen icon key if set and valid, otherwise "book-open".
 */
export function deckIconComponent(deck: { deckIcon?: string }) {
  const key = (deck.deckIcon ?? DEFAULT_ICON_KEY) as IconKey;
  return iconMap[key] ?? iconMap[DEFAULT_ICON_KEY]!;
}
