import type {
  AvailableTemplateField,
  CardTemplateBlock,
  CardTemplateBuilderState,
  FontFamilyKey,
  GeneratedTemplateDraft,
  TemplateSide,
  TemplateTheme,
} from "./types";
import { buildStateFromFields, DEFAULT_SETTINGS } from "./presets";

const THEME_VARS: Record<
  Exclude<TemplateTheme, "CUSTOM">,
  { bg: string; text: string; muted: string; accent: string; border: string }
> = {
  MINIMAL: { bg: "#ffffff", text: "#1f2937", muted: "#6b7280", accent: "#64748b", border: "#e5e7eb" },
  ZEN: { bg: "#fffaf2", text: "#1f2937", muted: "#6f746d", accent: "#6f8f72", border: "#e8dfd2" },
  MODERN: { bg: "#f8fafc", text: "#111827", muted: "#64748b", accent: "#2563eb", border: "#dbe3ef" },
  ACADEMIC: {
    bg: "#fbf7ef",
    text: "#1c1917",
    muted: "#78716c",
    accent: "#8b5e34",
    border: "#e7d7c1",
  },
  DARK: { bg: "#16181d", text: "#f8fafc", muted: "#a7b0bd", accent: "#92b4a0", border: "#2f343d" },
  JLPT: { bg: "#fff7ed", text: "#1f2937", muted: "#7c6f64", accent: "#d65f2f", border: "#f2d8c8" },
};

export const FONT_FAMILY_CSS: Record<FontFamilyKey, string> = {
  SANS: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
  SERIF: 'ui-serif, Georgia, Cambria, "Times New Roman", "Noto Serif JP", serif',
  ROUNDED:
    'ui-rounded, "Hiragino Maru Gothic ProN", "Quicksand", "Varela Round", system-ui, sans-serif',
  MONO: 'ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", monospace',
  JP_GOTHIC: '"Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "Noto Sans JP", sans-serif',
  JP_MINCHO: '"Hiragino Mincho ProN", "Yu Mincho", "MS Mincho", "Noto Serif JP", serif',
};

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function blockClass(block: CardTemplateBlock): string {
  const ct = block.contentType.toLowerCase();
  return `card-block card-block-${ct} card-block-${block.size}`;
}

function renderBlock(block: CardTemplateBlock): string {
  const labelHtml = block.showLabel
    ? `<div class="card-block-label">${escapeAttr(block.label)}</div>`
    : "";
  return `<div class="${blockClass(block)}" data-field="${escapeAttr(block.fieldName)}">${labelHtml}<div class="card-block-value">{{${block.fieldName}}}</div></div>`;
}

export function generateSideTemplate(state: CardTemplateBuilderState, side: TemplateSide): string {
  return state.sides[side]
    .filter((block) => block.enabled)
    .map(renderBlock)
    .join("\n");
}

function resolveColors(state: CardTemplateBuilderState) {
  if (state.settings.theme === "CUSTOM") {
    const c = state.settings.customColors;
    return { bg: c.bg, text: c.text, muted: c.text, accent: c.accent, border: c.border };
  }
  return THEME_VARS[state.settings.theme];
}

export function generateCss(state: CardTemplateBuilderState): string {
  const { typography, layout, media, japanese } = state.settings;
  const vars = resolveColors(state);
  const align = layout.mode === "LEFT" || layout.mode === "IMAGE_LEFT" ? "left" : layout.mode === "RIGHT" ? "right" : "center";
  const maxWidth = layout.mode === "FOCUS" ? "560px" : layout.mode === "COMPACT" ? "520px" : "720px";
  const gap =
    layout.spacing === "compact" || layout.mode === "COMPACT"
      ? "8px"
      : layout.spacing === "roomy"
        ? "24px"
        : "16px";
  const padding = layout.mode === "COMPACT" ? "22px 18px" : layout.spacing === "roomy" ? "48px 32px" : "36px 24px";

  const textColor = typography.textColor ?? "var(--card-text)";
  const fontStyle = typography.italic ? "italic" : "normal";
  const textDecoration = typography.underline ? "underline" : "none";
  const textTransform = typography.uppercase ? "uppercase" : "none";
  const fontFamily = FONT_FAMILY_CSS[typography.fontFamily] ?? FONT_FAMILY_CSS.SANS;

  return `.card {
  --card-bg: ${vars.bg};
  --card-text: ${vars.text};
  --card-muted: ${vars.muted};
  --card-accent: ${vars.accent};
  --card-border: ${vars.border};
  min-height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: ${align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center"};
  justify-content: center;
  padding: ${padding};
  background: var(--card-bg);
  color: ${textColor};
  font-family: ${fontFamily};
  text-align: ${align};
  line-height: ${typography.lineHeight};
  letter-spacing: ${typography.letterSpacing}px;
  font-style: ${fontStyle};
}
.card-block {
  width: 100%;
  max-width: ${maxWidth};
  margin: 0 auto ${gap};
}
.card-block:last-child { margin-bottom: 0; }
.card-block-value {
  text-decoration: ${textDecoration};
  text-transform: ${textTransform};
}
.card-block-primary .card-block-value {
  font-size: ${typography.fontSize + 12}px;
  font-weight: ${typography.fontWeight};
}
.card-block-secondary .card-block-value {
  font-size: ${typography.fontSize}px;
  font-weight: ${Math.max(400, typography.fontWeight - 200)};
}
.card-block-caption .card-block-value {
  font-size: ${Math.max(13, typography.fontSize - 8)}px;
  color: var(--card-muted);
}
.card-block-label {
  font-size: ${Math.max(11, typography.fontSize - 10)}px;
  color: var(--card-muted);
  margin-bottom: 4px;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: .08em;
}
.card-block-image img,
.card img {
  display: ${media.showImage ? "block" : "none"};
  max-width: 100%;
  max-height: ${layout.mode === "COMPACT" ? "180px" : "260px"};
  height: auto;
  border-radius: 14px;
  margin: ${layout.mode === "IMAGE_TOP" ? "0 auto 18px" : align === "left" ? "8px 0" : align === "right" ? "8px 0 8px auto" : "8px auto"};
  border: 1px solid var(--card-border);
}
.card audio {
  display: ${media.showAudioButton ? "block" : "none"};
  width: min(100%, 320px);
  margin: 8px auto;
}
.card video {
  display: ${media.showVideo ? "block" : "none"};
  max-width: 100%;
  max-height: 260px;
  border-radius: 14px;
}
.card-block-cloze rt {
  visibility: ${japanese.furiganaMode === "HIDE" ? "hidden" : "visible"};
}
hr#answer {
  border: none;
  border-top: 1px solid var(--card-border);
  margin: 24px 0;
  width: 100%;
}`;
}

export function generateTemplates(state: CardTemplateBuilderState): GeneratedTemplateDraft {
  return {
    frontTemplate: generateSideTemplate(state, "FRONT"),
    backTemplate: generateSideTemplate(state, "BACK"),
    styling: generateCss(state),
  };
}

export function hasEnabledBlock(state: CardTemplateBuilderState, side: TemplateSide): boolean {
  return state.sides[side].some((block) => block.enabled);
}

/* ─────────────────────────────────────────
   Persistence
───────────────────────────────────────── */

export function parseBuilderConfig(value: string | null | undefined): CardTemplateBuilderState | null {
  if (!value?.trim()) return null;
  try {
    const parsed = JSON.parse(value) as CardTemplateBuilderState;
    if (!parsed || typeof parsed !== "object") return null;
    if (!parsed.sides?.FRONT || !parsed.sides?.BACK) return null;
    return {
      version: 2,
      sides: {
        FRONT: parsed.sides.FRONT.map(normalizeBlock),
        BACK: parsed.sides.BACK.map(normalizeBlock),
      },
      settings: {
        ...DEFAULT_SETTINGS,
        ...(parsed.settings ?? {}),
        layout: { ...DEFAULT_SETTINGS.layout, ...(parsed.settings?.layout ?? {}) },
        typography: {
          ...DEFAULT_SETTINGS.typography,
          ...(parsed.settings?.typography ?? {}),
        },
        japanese: {
          ...DEFAULT_SETTINGS.japanese,
          ...(parsed.settings?.japanese ?? {}),
        },
        media: { ...DEFAULT_SETTINGS.media, ...(parsed.settings?.media ?? {}) },
        customColors: {
          ...DEFAULT_SETTINGS.customColors,
          ...(parsed.settings?.customColors ?? {}),
        },
      },
    };
  } catch {
    return null;
  }
}

function normalizeBlock(block: CardTemplateBlock): CardTemplateBlock {
  return {
    id: block.id ?? `block-${block.side?.toLowerCase()}-${block.fieldName}-${Date.now()}`,
    side: block.side,
    fieldName: block.fieldName,
    contentType: block.contentType ?? "TEXT",
    label: block.label ?? block.fieldName,
    enabled: block.enabled ?? true,
    size: block.size ?? "secondary",
    showLabel: block.showLabel ?? false,
  };
}

/**
 * Reconcile a saved builder state with the latest fields on the sample card:
 * - keep saved blocks whose fieldName is still present
 * - drop blocks whose fieldName disappeared
 * - append blocks for new fields that don't have a matching saved block yet
 *
 * If we have no saved state at all, fall back to auto-build from fields.
 */
export function reconcileWithFields(
  saved: CardTemplateBuilderState | null,
  fields: AvailableTemplateField[]
): CardTemplateBuilderState {
  if (!saved) return buildStateFromFields(fields);

  const result: CardTemplateBuilderState = {
    version: 2,
    sides: { FRONT: [], BACK: [] },
    settings: saved.settings,
  };

  for (const side of ["FRONT", "BACK"] as const) {
    const sideFields = fields.filter((field) => field.side === side);
    const fieldMap = new Map(sideFields.map((field) => [field.name, field]));
    const seen = new Set<string>();

    // 1. keep saved blocks that still map to a real field
    for (const block of saved.sides[side]) {
      const match = fieldMap.get(block.fieldName);
      if (!match) continue;
      seen.add(block.fieldName);
      result.sides[side].push({
        ...block,
        contentType: match.contentType,
        label: match.label,
      });
    }

    // 2. append any new fields the user has added since
    sideFields.forEach((field, index) => {
      if (seen.has(field.name)) return;
      result.sides[side].push({
        id: `block-${side.toLowerCase()}-${field.name}-${Date.now()}-${index}`,
        side,
        fieldName: field.name,
        contentType: field.contentType,
        label: field.label,
        enabled: false, // new fields are off by default — user opts in
        size: "secondary",
        showLabel: false,
      });
    });
  }

  return result;
}
