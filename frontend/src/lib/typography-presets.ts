/**
 * Typography presets — chosen in /settings and applied globally by
 * `useTypography`.
 *
 * Two independent dimensions:
 *
 *   FONT FAMILY   →  swaps the `--font-sans` CSS var (and lazy-loads
 *                    a Google Fonts stylesheet when needed).
 *   FONT SIZE     →  swaps the `--app-font-size` var on `<html>`,
 *                    which proportionally scales Tailwind's rem grid
 *                    so spacing tracks alongside text.
 *
 * Vietnamese coverage — every web-font option below includes the
 * `vietnamese` Latin subset so diacritics render correctly.
 */

// ─── Font family ────────────────────────────────────────────────────────────

export type FontFamilyId =
    | "system"
    | "inter"
    | "geist"
    | "jakarta"
    | "manrope"
    | "dm-sans"
    | "outfit"
    | "vietnam"
    | "lexend"
    | "nunito"
    | "space-grotesk"
    | "poppins"
    | "montserrat"
    | "work-sans"
    | "quicksand"
    | "rubik"
    | "mulish"
    | "figtree"
    | "source-sans"
    | "jetbrains";

export interface FontFamilyPreset {
    id: FontFamilyId;
    /** Display name in the settings card. */
    name: string;
    /** Sub-label / sample preview text. */
    description: string;
    /** Value applied to `--font-sans`. */
    family: string;
    /**
     * Google Fonts CSS2 URL — injected into `<head>` lazily the first
     * time the user picks this preset. `null` for the system stack
     * (no network round trip).
     */
    href: string | null;
}

const SYSTEM_FALLBACK =
    "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, " +
    '"Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", ' +
    '"Apple Color Emoji", "Segoe UI Emoji", sans-serif';

export const FONT_FAMILIES: FontFamilyPreset[] = [
    {
        id: "system",
        name: "Hệ thống",
        description: "Theo OS — nhanh nhất",
        family: SYSTEM_FALLBACK,
        href: null,
    },
    {
        id: "inter",
        name: "Inter",
        description: "Chuẩn dashboards",
        family: `"Inter", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "geist",
        name: "Geist",
        description: "Tinh tế — Vercel",
        family: `"Geist", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "jakarta",
        name: "Plus Jakarta",
        description: "Hình học, thân thiện",
        family: `"Plus Jakarta Sans", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "manrope",
        name: "Manrope",
        description: "Hiện đại, neutral",
        family: `"Manrope", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "dm-sans",
        name: "DM Sans",
        description: "Sạch, dễ đọc",
        family: `"DM Sans", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "outfit",
        name: "Outfit",
        description: "Đặc trưng, trẻ trung",
        family: `"Outfit", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "vietnam",
        name: "Be Vietnam Pro",
        description: "Tối ưu tiếng Việt",
        family: `"Be Vietnam Pro", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "lexend",
        name: "Lexend",
        description: "Tối ưu đọc nhanh",
        family: `"Lexend", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "nunito",
        name: "Nunito",
        description: "Mềm mại, bo tròn",
        family: `"Nunito", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "space-grotesk",
        name: "Space Grotesk",
        description: "Techy, đặc trưng",
        family: `"Space Grotesk", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "poppins",
        name: "Poppins",
        description: "Tròn trịa, phổ biến",
        family: `"Poppins", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "montserrat",
        name: "Montserrat",
        description: "Mạnh mẽ, tiêu đề",
        family: `"Montserrat", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "work-sans",
        name: "Work Sans",
        description: "Gọn gàng, công sở",
        family: `"Work Sans", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "quicksand",
        name: "Quicksand",
        description: "Bo tròn, vui tươi",
        family: `"Quicksand", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "rubik",
        name: "Rubik",
        description: "Góc bo nhẹ, hiện đại",
        family: `"Rubik", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "mulish",
        name: "Mulish",
        description: "Thanh mảnh, nhẹ nhàng",
        family: `"Mulish", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Mulish:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "figtree",
        name: "Figtree",
        description: "Thân thiện, mới mẻ",
        family: `"Figtree", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "source-sans",
        name: "Source Sans 3",
        description: "Trung tính, dễ đọc",
        family: `"Source Sans 3", ${SYSTEM_FALLBACK}`,
        href: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
    {
        id: "jetbrains",
        name: "JetBrains Mono",
        description: "Đơn cách — code style",
        family: `"JetBrains Mono", ui-monospace, monospace`,
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap&subset=vietnamese",
    },
];

export const DEFAULT_FONT_FAMILY: FontFamilyId = "system";

export function findFontFamily(id: string | null | undefined): FontFamilyPreset {
    return (
        FONT_FAMILIES.find((f) => f.id === id) ??
        FONT_FAMILIES.find((f) => f.id === DEFAULT_FONT_FAMILY)!
    );
}

// ─── Font size (density) ────────────────────────────────────────────────────

export type FontSizeId = "compact" | "default" | "comfortable";

export interface FontSizePreset {
    id: FontSizeId;
    name: string;
    description: string;
    /** Value applied to `--app-font-size` on `<html>`. */
    size: string;
}

export const FONT_SIZES: FontSizePreset[] = [
    {
        id: "compact",
        name: "Gọn",
        description: "Nhỏ hơn — thấy nhiều dữ liệu",
        size: "14px",
    },
    {
        id: "default",
        name: "Mặc định",
        description: "Cân bằng — gốc của shadcn",
        size: "16px",
    },
    {
        id: "comfortable",
        name: "Thoáng",
        description: "Lớn hơn — dễ đọc",
        size: "17.5px",
    },
];

export const DEFAULT_FONT_SIZE: FontSizeId = "default";

export function findFontSize(id: string | null | undefined): FontSizePreset {
    return (
        FONT_SIZES.find((s) => s.id === id) ??
        FONT_SIZES.find((s) => s.id === DEFAULT_FONT_SIZE)!
    );
}
