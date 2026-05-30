/**
 * Color presets that re-tint the app's full CSS-variable palette at
 * runtime — not just `--primary`, but the entire neutral family
 * (background, card, popover, muted, accent, border, sidebar) so the
 * chrome harmonizes with the chosen accent color.
 *
 * Format note — values are stored as **OKLCH** strings to match
 * `index.css`. OKLCH is the perceptually-uniform model shadcn uses:
 *
 *   oklch(<lightness> <chroma> <hue>)
 *     lightness: 0..1   (brightness)
 *     chroma:    0..0.4 (saturation)
 *     hue:       0..360 (color wheel angle)
 *
 * Each preset ships a light + dark variant so we re-apply the right
 * one when the user flips between light / dark / system theme modes.
 *
 * Tinting strategy — we generate neutrals at the preset's hue but with
 * very low chroma (≤ 0.022) so backgrounds stay readable. The eye picks
 * up a faint warmth/coolness rather than a wash of color.
 */

export type ColorPresetId =
    | "sunset"
    | "ocean"
    | "forest"
    | "royal"
    | "rose"
    | "slate"
    | "amber"
    | "emerald"
    | "sky"
    | "indigo"
    | "coral"
    | "teal"
    | "crimson"
    | "magenta"
    | "lime"
    | "cyan"
    | "violet"
    | "stone"
    | "pink"
    | "gold";

/**
 * Every CSS variable we override. Stored as `Record<varName, oklch>`
 * so the hook can iterate without a separate var-name map.
 */
export type PresetVars = Record<string, string>;

export interface ColorPreset {
    id: ColorPresetId;
    /** Human label shown in the settings page card. */
    name: string;
    /** One-line blurb under the name. */
    description: string;
    /** Solid CSS color used to render the preset's preview swatch. */
    swatch: string;
    light: PresetVars;
    dark: PresetVars;
}

/**
 * Input shape for the preset builder — we keep the source data minimal
 * (hue + chroma) and derive every CSS var from those numbers so the
 * tints stay consistent across light/dark and across presets.
 */
interface PresetSeed {
    id: ColorPresetId;
    name: string;
    description: string;
    swatch: string;
    /** Primary hue (0..360). Used for `--primary`, `--ring`, `--sidebar-primary`. */
    hue: number;
    /** Chroma of the primary color in light mode. Dark mode uses ~0.95×. */
    chroma: number;
    /**
     * Hue used for the neutral family (background, card, muted, accent,
     * border, sidebar). Defaults to the primary `hue` so neutrals feel
     * "of the same family" as the accent. Override only when you want
     * the neutrals to lean a different direction.
     */
    neutralHue?: number;
    /**
     * Chroma scale for the neutral family. `1.0` is the default tint
     * strength; raise/lower per preset for more/less colorful chrome.
     * Slate uses a low value so neutrals stay nearly gray.
     */
    neutralScale?: number;
}

/**
 * Build the full light-mode var dict from a seed.
 *
 * Lightness anchors mirror the original `:root` palette in
 * `index.css` — only the hue + chroma shift per preset. That way every
 * preset preserves the same visual rhythm (paper-white background,
 * slightly-darker card, etc) and only the color temperature changes.
 */
function buildLightVars(seed: PresetSeed): PresetVars {
    const nh = seed.neutralHue ?? seed.hue;
    const ns = seed.neutralScale ?? 1;
    const c = (base: number) => +(base * ns).toFixed(4);

    return {
        "--background": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--foreground": `oklch(0.145 ${c(0.012)} ${nh})`,
        "--card": `oklch(0.992 ${c(0.004)} ${nh})`,
        "--card-foreground": `oklch(0.145 ${c(0.012)} ${nh})`,
        "--popover": `oklch(0.992 ${c(0.004)} ${nh})`,
        "--popover-foreground": `oklch(0.145 ${c(0.012)} ${nh})`,
        "--primary": `oklch(0.6 ${seed.chroma} ${seed.hue})`,
        "--primary-foreground": "oklch(0.985 0 0)",
        "--secondary": `oklch(0.952 ${c(0.012)} ${nh})`,
        "--secondary-foreground": `oklch(0.205 ${c(0.01)} ${nh})`,
        "--muted": `oklch(0.952 ${c(0.012)} ${nh})`,
        "--muted-foreground": `oklch(0.528 ${c(0.014)} ${nh})`,
        "--accent": `oklch(0.936 ${c(0.022)} ${nh})`,
        "--accent-foreground": `oklch(0.2 ${c(0.01)} ${nh})`,
        "--border": `oklch(0.902 ${c(0.01)} ${nh})`,
        "--input": `oklch(0.902 ${c(0.01)} ${nh})`,
        "--ring": `oklch(0.6 ${seed.chroma} ${seed.hue})`,
        "--sidebar": `oklch(0.972 ${c(0.009)} ${nh})`,
        "--sidebar-foreground": `oklch(0.145 ${c(0.012)} ${nh})`,
        "--sidebar-primary": `oklch(0.6 ${seed.chroma} ${seed.hue})`,
        "--sidebar-primary-foreground": "oklch(0.985 0 0)",
        "--sidebar-accent": `oklch(0.936 ${c(0.022)} ${nh})`,
        "--sidebar-accent-foreground": `oklch(0.2 ${c(0.01)} ${nh})`,
        "--sidebar-border": `oklch(0.902 ${c(0.01)} ${nh})`,
        "--sidebar-ring": `oklch(0.6 ${seed.chroma} ${seed.hue})`,
    };
}

function buildDarkVars(seed: PresetSeed): PresetVars {
    const nh = seed.neutralHue ?? seed.hue;
    const ns = seed.neutralScale ?? 1;
    const c = (base: number) => +(base * ns).toFixed(4);
    const primaryDarkChroma = +(seed.chroma * 0.93).toFixed(4);

    return {
        "--background": `oklch(0.158 ${c(0.012)} ${nh})`,
        "--foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--card": `oklch(0.21 ${c(0.012)} ${nh})`,
        "--card-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--popover": `oklch(0.21 ${c(0.012)} ${nh})`,
        "--popover-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--primary": `oklch(0.72 ${primaryDarkChroma} ${seed.hue})`,
        "--primary-foreground": `oklch(0.158 ${c(0.012)} ${nh})`,
        "--secondary": `oklch(0.268 ${c(0.012)} ${nh})`,
        "--secondary-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--muted": `oklch(0.268 ${c(0.012)} ${nh})`,
        "--muted-foreground": `oklch(0.685 ${c(0.01)} ${nh})`,
        "--accent": `oklch(0.285 ${c(0.022)} ${nh})`,
        "--accent-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        // Borders stay achromatic in dark mode — a tinted border at this
        // lightness reads as a dim line of color, which looks broken.
        "--border": "oklch(1 0 0 / 10%)",
        "--input": "oklch(1 0 0 / 15%)",
        "--ring": `oklch(0.72 ${primaryDarkChroma} ${seed.hue})`,
        "--sidebar": `oklch(0.21 ${c(0.012)} ${nh})`,
        "--sidebar-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--sidebar-primary": `oklch(0.72 ${primaryDarkChroma} ${seed.hue})`,
        "--sidebar-primary-foreground": `oklch(0.158 ${c(0.012)} ${nh})`,
        "--sidebar-accent": `oklch(0.285 ${c(0.022)} ${nh})`,
        "--sidebar-accent-foreground": `oklch(0.985 ${c(0.006)} ${nh})`,
        "--sidebar-border": "oklch(1 0 0 / 10%)",
        "--sidebar-ring": `oklch(0.72 ${primaryDarkChroma} ${seed.hue})`,
    };
}

function makePreset(seed: PresetSeed): ColorPreset {
    return {
        id: seed.id,
        name: seed.name,
        description: seed.description,
        swatch: seed.swatch,
        light: buildLightVars(seed),
        dark: buildDarkVars(seed),
    };
}

const SEEDS: PresetSeed[] = [
    // Sunset keeps the project's original look — warm yellow-orange
    // neutrals (hue 55) under a cam-đỏ primary (hue 42).
    {
        id: "sunset",
        name: "Sunset",
        description: "Cam đỏ ấm — màu mặc định",
        swatch: "#d97757",
        hue: 42,
        chroma: 0.155,
        neutralHue: 55,
    },
    // Ocean — cool blue throughout. Neutrals lean toward the same blue
    // so the surface feels like a coastal evening.
    {
        id: "ocean",
        name: "Ocean",
        description: "Xanh dương đậm — đáng tin cậy",
        swatch: "#2563eb",
        hue: 250,
        chroma: 0.18,
        neutralHue: 245,
    },
    // Forest — leaf-green primary with a green-leaning neutral.
    {
        id: "forest",
        name: "Forest",
        description: "Xanh lá thiên nhiên — dịu mắt",
        swatch: "#16a34a",
        hue: 150,
        chroma: 0.15,
        neutralHue: 150,
    },
    // Royal — premium purple. Slightly higher neutral chroma so the
    // surfaces feel rich rather than washed-out.
    {
        id: "royal",
        name: "Royal",
        description: "Tím sang trọng — premium",
        swatch: "#7c3aed",
        hue: 290,
        chroma: 0.2,
        neutralHue: 290,
        neutralScale: 1.1,
    },
    // Rose — warm rose-pink chrome.
    {
        id: "rose",
        name: "Rose",
        description: "Hồng đào — ấm áp, thân thiện",
        swatch: "#e11d48",
        hue: 15,
        chroma: 0.2,
        neutralHue: 15,
    },
    // Slate — neutral palette intentionally desaturated. We lower the
    // neutral scale so backgrounds are nearly gray; only the primary
    // carries a hint of blue.
    {
        id: "slate",
        name: "Slate",
        description: "Xám trung tính — tối giản",
        swatch: "#475569",
        hue: 250,
        chroma: 0.04,
        neutralHue: 250,
        neutralScale: 0.3,
    },
    // Amber — golden honey. Warmer than sunset, more saturated.
    {
        id: "amber",
        name: "Amber",
        description: "Vàng mật — rực rỡ, năng lượng",
        swatch: "#f59e0b",
        hue: 70,
        chroma: 0.17,
        neutralHue: 70,
    },
    // Emerald — bluer, more saturated green than Forest.
    {
        id: "emerald",
        name: "Emerald",
        description: "Xanh ngọc — tươi mới",
        swatch: "#10b981",
        hue: 162,
        chroma: 0.16,
        neutralHue: 162,
    },
    // Sky — cool clear blue, lighter than Ocean.
    {
        id: "sky",
        name: "Sky",
        description: "Xanh trời — sáng, thoáng",
        swatch: "#0ea5e9",
        hue: 222,
        chroma: 0.16,
        neutralHue: 222,
    },
    // Indigo — between blue and purple. Tech-startup vibe.
    {
        id: "indigo",
        name: "Indigo",
        description: "Chàm — chuẩn fintech",
        swatch: "#6366f1",
        hue: 275,
        chroma: 0.19,
        neutralHue: 275,
    },
    // Coral — warm orange-pink, livelier than Rose.
    {
        id: "coral",
        name: "Coral",
        description: "San hô — ấm, vui tươi",
        swatch: "#fb7185",
        hue: 28,
        chroma: 0.18,
        neutralHue: 28,
    },
    // Teal — blue-green, calm and professional.
    {
        id: "teal",
        name: "Teal",
        description: "Xanh ngọc lam — điềm tĩnh",
        swatch: "#14b8a6",
        hue: 195,
        chroma: 0.13,
        neutralHue: 195,
    },
    // Crimson — deep, confident red.
    {
        id: "crimson",
        name: "Crimson",
        description: "Đỏ thẫm — mạnh mẽ",
        swatch: "#dc2626",
        hue: 25,
        chroma: 0.19,
        neutralHue: 25,
    },
    // Magenta — vivid pink-purple.
    {
        id: "magenta",
        name: "Magenta",
        description: "Hồng cánh sen — nổi bật",
        swatch: "#c026d3",
        hue: 328,
        chroma: 0.21,
        neutralHue: 328,
    },
    // Lime — fresh yellow-green.
    {
        id: "lime",
        name: "Lime",
        description: "Xanh chanh — tươi tắn",
        swatch: "#65a30d",
        hue: 130,
        chroma: 0.16,
        neutralHue: 130,
    },
    // Cyan — bright aqua.
    {
        id: "cyan",
        name: "Cyan",
        description: "Lục lam — mát mẻ",
        swatch: "#06b6d4",
        hue: 205,
        chroma: 0.15,
        neutralHue: 205,
    },
    // Violet — saturated purple, brighter than Royal.
    {
        id: "violet",
        name: "Violet",
        description: "Tím violet — rực rỡ",
        swatch: "#a855f7",
        hue: 305,
        chroma: 0.2,
        neutralHue: 305,
    },
    // Stone — warm neutral brown-gray, near achromatic.
    {
        id: "stone",
        name: "Stone",
        description: "Nâu đá — trung tính ấm",
        swatch: "#78716c",
        hue: 60,
        chroma: 0.03,
        neutralHue: 60,
        neutralScale: 0.35,
    },
    // Pink — soft candy pink.
    {
        id: "pink",
        name: "Pink",
        description: "Hồng kẹo — dịu dàng",
        swatch: "#ec4899",
        hue: 350,
        chroma: 0.19,
        neutralHue: 350,
    },
    // Gold — olive-gold, earthy.
    {
        id: "gold",
        name: "Gold",
        description: "Vàng kim — sang trọng",
        swatch: "#ca8a04",
        hue: 85,
        chroma: 0.16,
        neutralHue: 85,
    },
];

export const COLOR_PRESETS: ColorPreset[] = SEEDS.map(makePreset);

export const DEFAULT_COLOR_PRESET: ColorPresetId = "sunset";

export function findColorPreset(id: string | null | undefined): ColorPreset {
    return (
        COLOR_PRESETS.find((p) => p.id === id) ??
        COLOR_PRESETS.find((p) => p.id === DEFAULT_COLOR_PRESET)!
    );
}

/**
 * Every CSS variable a preset can touch. Used by the hook to clear /
 * reapply on theme or preset changes. Derived from the default preset
 * so it stays in sync with `buildLightVars` automatically.
 */
export const PRESET_VAR_NAMES: string[] = Object.keys(
    COLOR_PRESETS.find((p) => p.id === DEFAULT_COLOR_PRESET)!.light,
);
