import { useCallback, useEffect, useMemo, useState } from "react";

import type { FieldSchema } from "@/types/common/datatable";

/**
 * Per-entity card view customization.
 *
 * Persisted under `cardLayout:<entityName>` so every ProTable mount of
 * the same entity reuses the user's layout, while different entities
 * stay independent (Books can show a cover image; Permissions cannot).
 */
export interface CardLayoutConfig {
    // ─── Content ────────────────────────────────────────────────────────────
    /** Field rendered as the bold title row. `null` = no title. */
    titleField: string | null;
    /** Secondary muted line below the title. `null` = no subtitle. */
    subtitleField: string | null;
    /** Field whose value is treated as an image URL. `null` = no image. */
    imageField: string | null;
    /** Names of fields rendered in the body label/value list. */
    bodyFields: string[];

    // ─── Image ──────────────────────────────────────────────────────────────
    /** Where the image sits relative to the meta. */
    imagePosition: "top" | "left" | "hidden";
    /** Aspect ratio applied to the image area. */
    imageAspect: "square" | "video" | "wide" | "portrait";
    /** How the image scales inside the aspect box. */
    imageFit: "cover" | "contain";
    /** When true the title block sits *on top* of the image with a
     *  bottom-up gradient — magazine cover style. Only works with
     *  `imagePosition === "top"`. */
    titleOnImage: boolean;

    // ─── Title styling ──────────────────────────────────────────────────────
    titleSize: "sm" | "md" | "lg";
    titleAlign: "left" | "center";

    // ─── Body styling ───────────────────────────────────────────────────────
    /** How label and value relate visually. */
    fieldDisplay: "inline" | "stacked" | "value-only";
    /** Show / hide labels in the body list (independent of fieldDisplay
     *  so a user can still pick inline-no-labels for cleaner cards). */
    showLabels: boolean;

    // ─── Header chrome ──────────────────────────────────────────────────────
    /** Show the `#<index>` chip in the card header. */
    showIndex: boolean;
    /** Show CRUD action buttons. */
    showActions: boolean;
    /** Where the actions live. `"hover"` only shows them on row hover. */
    actionsPosition: "header" | "footer" | "hover";

    // ─── Card surface ───────────────────────────────────────────────────────
    cardRadius: "sharp" | "default" | "soft";
    cardShadow: "none" | "subtle" | "lifted";
    cardBorder: "none" | "subtle" | "accent";
    cardDensity: "compact" | "normal" | "cozy";

    // ─── Grid ───────────────────────────────────────────────────────────────
    /** Override the responsive grid. `0` = auto (default 2/3/4 by breakpoint). */
    gridColumns: 0 | 1 | 2 | 3 | 4 | 6;
}

const STORAGE_PREFIX = "cardLayout:";

// ─── Detection heuristics ───────────────────────────────────────────────────

const IMAGE_NAME_RE = /(image|avatar|photo|thumbnail|picture|logo|cover|banner)/i;

const TITLE_CANDIDATES = [
    "title",
    "name",
    "fullName",
    "displayName",
    "username",
    "label",
    "subject",
];

const SUBTITLE_CANDIDATES = [
    "email",
    "subtitle",
    "code",
    "description",
    "summary",
    "slug",
];

const SYSTEM_FIELDS = new Set(["createdAt", "updatedAt", "createdBy", "updatedBy"]);

function findByName(fields: FieldSchema[], candidates: string[]): FieldSchema | null {
    for (const c of candidates) {
        const f = fields.find((ff) => ff.name === c);
        if (f) return f;
    }
    return null;
}

function isImageField(f: FieldSchema): boolean {
    // Two independent signals:
    //   1. Explicit type set by the BE schema (`type: "image"`).
    //   2. Name heuristic — covers older entities whose URL fields ship
    //      as plain text but follow the avatar/cover/logo convention.
    return f.type === "image" || IMAGE_NAME_RE.test(f.name);
}

function detectImageField(fields: FieldSchema[]): FieldSchema | null {
    // Prefer fields that explicitly declare type:"image" — they're the
    // most authoritative signal. Fall back to name-based heuristics.
    return (
        fields.find((f) => f.type === "image") ??
        fields.find((f) => IMAGE_NAME_RE.test(f.name)) ??
        null
    );
}

function detectTitleField(fields: FieldSchema[]): FieldSchema | null {
    const byName = findByName(fields, TITLE_CANDIDATES);
    if (byName) return byName;
    const bold = fields.find((f) => f.bold);
    if (bold) return bold;
    return (
        fields.find((f) => f.type === "text" || f.type === "textarea") ?? null
    );
}

function detectSubtitleField(
    fields: FieldSchema[],
    excludeName: string | null,
): FieldSchema | null {
    const candidates = fields.filter((f) => f.name !== excludeName);
    return findByName(candidates, SUBTITLE_CANDIDATES);
}

/**
 * The "default layout" for an entity, computed each render from the
 * field schema. Used both to seed first-time configs and as the
 * target of the "Reset" action in the editor.
 */
function computeDefaults(visibleFields: FieldSchema[]): CardLayoutConfig {
    const image = detectImageField(visibleFields);
    const title = detectTitleField(visibleFields);
    const subtitle = detectSubtitleField(visibleFields, title?.name ?? null);
    const used = new Set<string>(
        [image?.name, title?.name, subtitle?.name].filter(
            (n): n is string => !!n,
        ),
    );
    const bodyFields = visibleFields
        .filter(
            (f) =>
                !used.has(f.name) &&
                !SYSTEM_FIELDS.has(f.name) &&
                f.type !== "password",
        )
        .map((f) => f.name);

    return {
        titleField: title?.name ?? null,
        subtitleField: subtitle?.name ?? null,
        imageField: image?.name ?? null,
        bodyFields,

        imagePosition: image ? "top" : "hidden",
        imageAspect: "video",
        imageFit: "cover",
        titleOnImage: false,

        titleSize: "md",
        titleAlign: "left",

        fieldDisplay: "inline",
        showLabels: true,

        showIndex: true,
        showActions: true,
        actionsPosition: "header",

        cardRadius: "default",
        cardShadow: "subtle",
        cardBorder: "subtle",
        cardDensity: "normal",

        gridColumns: 0,
    };
}

// ─── Presets ────────────────────────────────────────────────────────────────

export type PresetId =
    | "default"
    | "compact"
    | "product"
    | "profile"
    | "article"
    | "minimal";

export interface CardLayoutPreset {
    id: PresetId;
    name: string;
    description: string;
    /** Function that builds the final config given the detected defaults.
     *  Receives detected defaults so presets can still benefit from the
     *  schema-aware title/subtitle/image picks. */
    build: (defaults: CardLayoutConfig) => CardLayoutConfig;
}

export const CARD_LAYOUT_PRESETS: CardLayoutPreset[] = [
    {
        id: "default",
        name: "Mặc định",
        description: "Tự động theo schema",
        build: (d) => d,
    },
    {
        id: "compact",
        name: "Gọn",
        description: "Danh sách dày, không hình",
        build: (d) => ({
            ...d,
            imagePosition: "hidden",
            fieldDisplay: "inline",
            showLabels: true,
            cardDensity: "compact",
            cardShadow: "none",
            cardBorder: "subtle",
            cardRadius: "default",
            gridColumns: 4,
            actionsPosition: "hover",
        }),
    },
    {
        id: "product",
        name: "Sản phẩm",
        description: "Ảnh trên vuông, tiêu đề giữa",
        build: (d) => ({
            ...d,
            imagePosition: d.imageField ? "top" : "hidden",
            imageAspect: "square",
            imageFit: "cover",
            titleOnImage: false,
            titleSize: "md",
            titleAlign: "center",
            fieldDisplay: "inline",
            cardDensity: "cozy",
            cardShadow: "subtle",
            cardBorder: "subtle",
            cardRadius: "soft",
            gridColumns: 4,
            actionsPosition: "hover",
        }),
    },
    {
        id: "profile",
        name: "Hồ sơ",
        description: "Ảnh vuông trái, info phải",
        build: (d) => ({
            ...d,
            imagePosition: d.imageField ? "left" : "hidden",
            imageAspect: "square",
            imageFit: "cover",
            titleSize: "md",
            titleAlign: "left",
            fieldDisplay: "inline",
            cardDensity: "normal",
            cardShadow: "subtle",
            cardBorder: "subtle",
            cardRadius: "default",
            gridColumns: 2,
            actionsPosition: "header",
        }),
    },
    {
        id: "article",
        name: "Bài viết",
        description: "Banner rộng, title trên ảnh",
        build: (d) => ({
            ...d,
            imagePosition: d.imageField ? "top" : "hidden",
            imageAspect: "wide",
            imageFit: "cover",
            titleOnImage: !!d.imageField,
            titleSize: "lg",
            titleAlign: "left",
            fieldDisplay: "inline",
            showLabels: false,
            cardDensity: "cozy",
            cardShadow: "lifted",
            cardBorder: "none",
            cardRadius: "soft",
            gridColumns: 2,
            actionsPosition: "footer",
        }),
    },
    {
        id: "minimal",
        name: "Tối giản",
        description: "Chữ thuần, không viền/bóng",
        build: (d) => ({
            ...d,
            imagePosition: "hidden",
            fieldDisplay: "value-only",
            showLabels: false,
            titleSize: "md",
            titleAlign: "left",
            cardDensity: "compact",
            cardShadow: "none",
            cardBorder: "none",
            cardRadius: "sharp",
            gridColumns: 3,
            actionsPosition: "hover",
        }),
    },
];

// ─── Storage ────────────────────────────────────────────────────────────────

function readStored(entityName: string): CardLayoutConfig | null {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + entityName);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (typeof parsed !== "object" || parsed === null) return null;
        return parsed as CardLayoutConfig;
    } catch {
        return null;
    }
}

function writeStored(entityName: string, config: CardLayoutConfig): void {
    try {
        localStorage.setItem(
            STORAGE_PREFIX + entityName,
            JSON.stringify(config),
        );
    } catch {
        // localStorage disabled — silent
    }
}

export interface CardLayoutMetadata {
    imageCandidates: FieldSchema[];
    titleCandidates: FieldSchema[];
    bodyCandidates: FieldSchema[];
    /** Default config for the current schema — target of the "Reset" action. */
    defaults: CardLayoutConfig;
}

export interface UseCardLayoutResult {
    config: CardLayoutConfig;
    setConfig: (
        next: CardLayoutConfig | ((prev: CardLayoutConfig) => CardLayoutConfig),
    ) => void;
    /** Update a single key — convenient in the editor's form controls. */
    update: <K extends keyof CardLayoutConfig>(
        key: K,
        value: CardLayoutConfig[K],
    ) => void;
    resetToDefault: () => void;
    /** Apply a preset on top of the current detected defaults. */
    applyPreset: (id: PresetId) => void;
    meta: CardLayoutMetadata;
}

export interface UseCardLayoutOptions {
    /**
     * Preset applied as the seed config when the user has not yet
     * customized this entity's card layout. Already-stored configs
     * always win — this only influences first-time visits.
     *
     * Catalog mode (read-only viewers) uses this to land on a
     * gallery-style preset immediately instead of the schema-derived
     * defaults that may look bare on entities with images.
     */
    defaultPresetId?: PresetId;
}

/**
 * Card-layout state for one ProTable mount.
 *
 * Reads visibleFields (not all schema fields) so the editor's choices
 * stay aligned with what the column-visibility menu actually shows.
 */
export function useCardLayout(
    entityName: string,
    visibleFields: FieldSchema[],
    options?: UseCardLayoutOptions,
): UseCardLayoutResult {
    const meta = useMemo<CardLayoutMetadata>(() => {
        const imageCandidates = visibleFields.filter(isImageField);
        const titleCandidates = visibleFields.filter(
            (f) =>
                f.type !== "password" &&
                f.type !== "boolean" &&
                f.type !== "relation",
        );
        const bodyCandidates = visibleFields.filter(
            (f) => f.type !== "password",
        );
        return {
            imageCandidates,
            titleCandidates,
            bodyCandidates,
            defaults: computeDefaults(visibleFields),
        };
    }, [visibleFields]);

    // Seed config: explicit defaultPresetId (catalog mode) takes
    // priority over the bare schema-derived defaults, but stored user
    // customizations always trump both.
    const seedConfig = useMemo<CardLayoutConfig>(() => {
        if (!options?.defaultPresetId) return meta.defaults;
        const preset = CARD_LAYOUT_PRESETS.find(
            (p) => p.id === options.defaultPresetId,
        );
        return preset ? preset.build(meta.defaults) : meta.defaults;
    }, [meta.defaults, options?.defaultPresetId]);

    const [config, setConfigState] = useState<CardLayoutConfig>(() => {
        const stored = readStored(entityName);
        return stored
            ? { ...seedConfig, ...stored } // merge so missing keys fall back
            : seedConfig;
    });

    useEffect(() => {
        const stored = readStored(entityName);
        setConfigState(stored ? { ...seedConfig, ...stored } : seedConfig);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [entityName]);

    const setConfig = useCallback<UseCardLayoutResult["setConfig"]>(
        (next) => {
            setConfigState((prev) => {
                const resolved =
                    typeof next === "function"
                        ? (next as (p: CardLayoutConfig) => CardLayoutConfig)(prev)
                        : next;
                writeStored(entityName, resolved);
                return resolved;
            });
        },
        [entityName],
    );

    const update = useCallback<UseCardLayoutResult["update"]>(
        (key, value) => {
            setConfig((prev) => ({ ...prev, [key]: value }));
        },
        [setConfig],
    );

    const resetToDefault = useCallback(() => {
        setConfig(meta.defaults);
    }, [meta.defaults, setConfig]);

    const applyPreset = useCallback<UseCardLayoutResult["applyPreset"]>(
        (id) => {
            const preset = CARD_LAYOUT_PRESETS.find((p) => p.id === id);
            if (!preset) return;
            setConfig(preset.build(meta.defaults));
        },
        [meta.defaults, setConfig],
    );

    return { config, setConfig, update, resetToDefault, applyPreset, meta };
}
