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

const FALLBACK_SWATCHES = COLOR_PRESETS
  .filter((p) => !["slate", "stone"].includes(p.id))
  .map((p) => p.swatch);

/**
 * Returns the background color (hex/oklch swatch string) for a deck.
 * Uses the user-chosen color preset if set, otherwise falls back to a
 * deterministic color based on the deck id.
 */
export function deckBgColor(deck: { id?: number; deckColor?: string }): string {
  if (deck.deckColor) {
    const preset = COLOR_PRESETS.find((p) => p.id === deck.deckColor);
    if (preset) return preset.swatch;
  }
  const n = FALLBACK_SWATCHES.length;
  return FALLBACK_SWATCHES[(deck.id ?? 0) % n]!;
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
