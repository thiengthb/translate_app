import type {
  AvailableTemplateField,
  CardTemplateBlock,
  CardTemplateBuilderState,
  CardTemplateSettings,
  CustomColors,
  TemplateSide,
} from "./types";

export const DEFAULT_CUSTOM_COLORS: CustomColors = {
  bg: "#ffffff",
  text: "#1f2937",
  accent: "#6f8f72",
  border: "#e5e7eb",
};

export const DEFAULT_SETTINGS: CardTemplateSettings = {
  layout: { mode: "CENTER", spacing: "comfortable" },
  typography: {
    fontFamily: "SANS",
    fontSize: 22,
    fontWeight: 700,
    lineHeight: 1.55,
    letterSpacing: 0,
    italic: false,
    underline: false,
    uppercase: false,
    textColor: null,
  },
  japanese: { furiganaMode: "SHOW" },
  media: {
    autoPlayAudio: false,
    showAudioButton: true,
    showImage: true,
    showVideo: true,
  },
  theme: "MINIMAL",
  customColors: { ...DEFAULT_CUSTOM_COLORS },
};

function cloneSettings(settings: CardTemplateSettings): CardTemplateSettings {
  return {
    layout: { ...settings.layout },
    typography: { ...settings.typography },
    japanese: { ...settings.japanese },
    media: { ...settings.media },
    theme: settings.theme,
    customColors: { ...settings.customColors },
  };
}

/** Default block size: first item is primary, the rest are secondary. */
function defaultSizeAt(index: number): CardTemplateBlock["size"] {
  return index === 0 ? "primary" : "secondary";
}

/**
 * Auto-build a builder state from the sample card's fields. Every available field
 * becomes a block (enabled by default). If the sample card has no fields, the state
 * has empty sides — the user adds blocks manually via UI controls.
 */
export function buildStateFromFields(
  fields: AvailableTemplateField[],
  base: CardTemplateSettings = DEFAULT_SETTINGS
): CardTemplateBuilderState {
  const sides: Record<TemplateSide, CardTemplateBlock[]> = {
    FRONT: [],
    BACK: [],
  };

  for (const side of ["FRONT", "BACK"] as const) {
    const sideFields = fields.filter((field) => field.side === side);
    sides[side] = sideFields.map((field, index) => ({
      id: `block-${side.toLowerCase()}-${field.name}-${index}`,
      side,
      fieldName: field.name,
      contentType: field.contentType,
      label: field.label,
      enabled: true,
      size: defaultSizeAt(index),
      showLabel: false,
    }));
  }

  return {
    version: 2,
    sides,
    settings: cloneSettings(base),
  };
}

/** Convenience for an empty builder state (when there's no sample card at all). */
export function createEmptyState(): CardTemplateBuilderState {
  return {
    version: 2,
    sides: { FRONT: [], BACK: [] },
    settings: cloneSettings(DEFAULT_SETTINGS),
  };
}
