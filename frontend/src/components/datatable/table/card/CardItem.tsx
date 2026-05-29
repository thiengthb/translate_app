import { Eye, ImageIcon, Pen, Trash2 } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { FieldSchema } from "@/types";

import ActionButton from "../../common/ActionButton";
import { CardFieldValue } from "./CardFieldValue";
import type { CardLayoutConfig } from "./useCardLayout";

interface CardItemProps {
    row: any;
    index: number;
    idField: string;
    isSelected: boolean;
    showActions?: boolean;
    visibleFields: FieldSchema[];
    relationOptions: Record<string, any[]>;
    onSelect: (id: any) => void;
    onRowClick?: (row: any) => void;
    renderRowActions?: (row: any) => React.ReactNode;
    onView: (row: any) => void;
    onEdit: (row: any) => void;
    onDelete: (row: any) => void;
    onBooleanToggle: (id: any, fieldName: string, newValue: boolean) => void;
    disableBooleanToggle?: boolean;
    /** Layout customization from `useCardLayout`. */
    layout: CardLayoutConfig;
    /**
     * Catalog mode — the viewer has read-only permission on this entity.
     * Suppresses the entire interactive chrome (checkbox, actions,
     * index pill) so the card reads as a browse-only tile, not an
     * editable row. Cards stay clickable to open the detail view.
     */
    readOnly?: boolean;
}

// ─── Style maps — keyed by config values for fast lookup ────────────────────

const ASPECT_CLASS: Record<CardLayoutConfig["imageAspect"], string> = {
    square: "aspect-square",
    video: "aspect-video", // 16:9
    wide: "aspect-[21/9]",
    portrait: "aspect-[3/4]",
};

const RADIUS_CLASS: Record<CardLayoutConfig["cardRadius"], string> = {
    sharp: "rounded-none",
    default: "rounded-lg",
    soft: "rounded-2xl",
};

const SHADOW_CLASS: Record<CardLayoutConfig["cardShadow"], string> = {
    none: "shadow-none",
    subtle: "shadow-sm",
    lifted: "shadow-md",
};

const BORDER_CLASS: Record<CardLayoutConfig["cardBorder"], string> = {
    none: "border-transparent",
    subtle: "border-border",
    accent: "border-primary/40",
};

// Density tokens. Each token bundles inner padding + body gap so the
// rhythm stays coherent — you can't pick "compact padding" and
// "cozy gap" and end up with weird spacing.
const DENSITY: Record<
    CardLayoutConfig["cardDensity"],
    { pad: string; titleGap: string; bodyGap: string; rowGap: string }
> = {
    compact: {
        pad: "px-3 py-2",
        titleGap: "gap-0.5",
        bodyGap: "gap-1.5",
        rowGap: "gap-0.5",
    },
    normal: {
        pad: "px-4 py-3",
        titleGap: "gap-1",
        bodyGap: "gap-2",
        rowGap: "gap-1",
    },
    cozy: {
        pad: "px-5 py-4",
        titleGap: "gap-1.5",
        bodyGap: "gap-3",
        rowGap: "gap-1.5",
    },
};

const TITLE_SIZE_CLASS: Record<CardLayoutConfig["titleSize"], string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
};

const FIT_CLASS: Record<CardLayoutConfig["imageFit"], string> = {
    cover: "object-cover",
    contain: "object-contain",
};

/**
 * A single card in card view. Every rendering decision is driven by
 * `CardLayoutConfig` — no hardcoded styling. See the style maps above
 * for the lookup tables that turn config values into Tailwind classes.
 */
export function CardItem({
    row,
    index,
    idField,
    isSelected,
    showActions: showActionsProp = true,
    visibleFields,
    relationOptions,
    onSelect,
    onRowClick,
    renderRowActions,
    onView,
    onEdit,
    onDelete,
    onBooleanToggle,
    disableBooleanToggle = false,
    layout,
    readOnly = false,
}: CardItemProps) {
    const id = row[idField];
    const density = DENSITY[layout.cardDensity];

    // Lookup table for fast access by name; the layout config stores
    // names so it survives schema reorders without dangling refs.
    const fieldByName = new Map(visibleFields.map((f) => [f.name, f]));

    const titleField = layout.titleField ? fieldByName.get(layout.titleField) : null;
    const subtitleField = layout.subtitleField
        ? fieldByName.get(layout.subtitleField)
        : null;
    const imageField = layout.imageField ? fieldByName.get(layout.imageField) : null;

    // Body = configured list ∩ currently-visible fields, minus fields
    // already promoted to title/subtitle/image (no double-render).
    const promoted = new Set(
        [layout.titleField, layout.subtitleField, layout.imageField].filter(
            (n): n is string => !!n,
        ),
    );
    const bodyFields = layout.bodyFields
        .map((n) => fieldByName.get(n))
        .filter((f): f is FieldSchema => !!f && !promoted.has(f.name))
        .filter((f) => f.type !== "password");

    const showImageSlot = imageField && layout.imagePosition !== "hidden";
    const imageUrl: string | null = showImageSlot
        ? coerceUrl(row[imageField!.name])
        : null;

    const titleValue = titleField ? String(row[titleField.name] ?? "") : "";
    const subtitleValue = subtitleField
        ? String(row[subtitleField.name] ?? "")
        : "";

    // Overlay only makes sense over a top image; ignored otherwise.
    const useTitleOverlay =
        layout.titleOnImage &&
        layout.imagePosition === "top" &&
        !!showImageSlot &&
        !!titleField;

    // Catalog mode forces ALL interactive chrome off — overrides both
    // the prop AND the layout config. The card stays clickable (row
    // click → detail) so users can still drill in.
    const showActions = !readOnly && showActionsProp && layout.showActions;
    const actionsHidden = !showActions;
    const showCheckbox = !readOnly;
    const showIndex = !readOnly && layout.showIndex;

    // ─── Building blocks ────────────────────────────────────────────────────

    const defaultActions = (
        <>
            <ActionButton
                onClick={() => onView(row)}
                tooltip="View detail"
                icon={<Eye size={10} className="text-muted-foreground" />}
            />
            <ActionButton
                onClick={() => onEdit(row)}
                tooltip="Edit"
                icon={<Pen size={10} className="text-muted-foreground" />}
            />
            <ActionButton
                onClick={() => onDelete(row)}
                tooltip="Delete"
                icon={<Trash2 size={10} className="text-red-500" />}
            />
        </>
    );

    const actionsNode = showActions && (
        <div
            className={cn(
                "flex gap-1 shrink-0 transition-opacity",
                layout.actionsPosition === "hover" &&
                    "opacity-0 group-hover/card:opacity-100",
            )}
        >
            {renderRowActions ? renderRowActions(row) : defaultActions}
        </div>
    );

    const checkboxNode = showCheckbox && (
        <div className="flex items-center gap-2 min-w-0">
            <Checkbox
                checked={isSelected}
                onCheckedChange={() => onSelect(id)}
                aria-label="Select card"
            />
            {showIndex && (
                <span className="text-xs text-muted-foreground font-medium">
                    #{index + 1}
                </span>
            )}
        </div>
    );

    // Catalog mode renders no header strip at all — the card becomes a
    // pure browsing tile. Otherwise: checkbox+index on the left,
    // actions on the right (or floating via hover overlay).
    const headerStrip = !readOnly && (
        <div className="flex items-center justify-between gap-2">
            {checkboxNode}
            {layout.actionsPosition === "header" && actionsNode}
            {layout.actionsPosition === "hover" && !actionsHidden && (
                <div className="absolute top-2 right-2 z-10 bg-card/95 backdrop-blur-sm rounded-md p-0.5 border shadow-sm">
                    {actionsNode}
                </div>
            )}
        </div>
    );

    const titleBlock = (titleField || subtitleField) && (
        <div
            className={cn(
                "flex flex-col min-w-0",
                density.titleGap,
                layout.titleAlign === "center" && "items-center text-center",
            )}
        >
            {titleField && (
                <span
                    className={cn(
                        "font-semibold leading-tight truncate",
                        TITLE_SIZE_CLASS[layout.titleSize],
                        // When overlaid, force white text + drop shadow
                        // so it stays legible regardless of image.
                        useTitleOverlay
                            ? "text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]"
                            : "text-foreground",
                    )}
                >
                    {titleValue || "—"}
                </span>
            )}
            {subtitleField && (
                <span
                    className={cn(
                        "text-xs leading-tight truncate",
                        useTitleOverlay
                            ? "text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]"
                            : "text-muted-foreground",
                    )}
                >
                    {subtitleValue || "—"}
                </span>
            )}
        </div>
    );

    const placeholderSeed = String(row[idField] ?? titleValue ?? imageField?.name ?? "");
    const imageBlock = showImageSlot && (
        <div
            className={cn(
                "relative w-full overflow-hidden bg-muted",
                ASPECT_CLASS[layout.imageAspect],
                // Round only the corners touching the card edge so the
                // image meets body content cleanly. Inner edges square.
                layout.imagePosition === "top" &&
                    (layout.cardRadius === "sharp"
                        ? ""
                        : layout.cardRadius === "soft"
                          ? "rounded-t-2xl"
                          : "rounded-t-lg"),
                layout.imagePosition === "left" &&
                    (layout.cardRadius === "sharp"
                        ? ""
                        : layout.cardRadius === "soft"
                          ? "rounded-l-2xl"
                          : "rounded-l-lg"),
            )}
        >
            {/* Placeholder is ALWAYS rendered as the base layer; the
                <img> stacks above it. If the URL fails to load,
                `onError` hides the <img> via display:none and the
                placeholder shows through — no extra state, no flicker. */}
            <ImagePlaceholder seed={placeholderSeed} label={titleValue} />
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={titleValue || imageField?.label || "image"}
                    loading="lazy"
                    className={cn(
                        "absolute inset-0 h-full w-full transition-transform duration-500",
                        FIT_CLASS[layout.imageFit],
                        // Subtle hover-zoom adds a gallery feel without
                        // overdoing it — kicks in via the group-hover
                        // selector on the outer card.
                        "group-hover/card:scale-[1.03]",
                    )}
                    onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                    }}
                />
            )}
            {/* Title overlay: gradient base + title block anchored to
                the bottom of the image. */}
            {useTitleOverlay && (
                <>
                    <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                        {titleBlock}
                    </div>
                </>
            )}
        </div>
    );

    const bodyBlock = bodyFields.length > 0 && (
        <div className={cn("min-w-0 overflow-hidden flex flex-col", density.bodyGap)}>
            {bodyFields.map((f) => (
                <BodyRow
                    key={f.name}
                    field={f}
                    value={row[f.name]}
                    relationOptions={relationOptions}
                    disableBooleanToggle={disableBooleanToggle}
                    onBooleanToggle={(fieldName, newValue) =>
                        onBooleanToggle(id, fieldName, newValue)
                    }
                    mode={layout.fieldDisplay}
                    showLabel={layout.showLabels}
                />
            ))}
        </div>
    );

    const footerBlock =
        !readOnly &&
        layout.actionsPosition === "footer" &&
        actionsNode && (
            <div
                className={cn(
                    "flex justify-end pt-2 border-t mt-1",
                    density.pad,
                )}
            >
                {actionsNode}
            </div>
        );

    // ─── Compose by image position ──────────────────────────────────────────

    const cardBase = cn(
        "group/card relative cursor-pointer transition-all overflow-hidden p-0 border bg-card text-foreground",
        RADIUS_CLASS[layout.cardRadius],
        SHADOW_CLASS[layout.cardShadow],
        BORDER_CLASS[layout.cardBorder],
        "hover:shadow-md",
        isSelected && "ring-2 ring-primary",
    );

    const onCardClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement | null;
        if (target?.closest("button, a, input, label, [role=switch]")) return;
        onRowClick?.(row);
    };

    if (layout.imagePosition === "left" && showImageSlot) {
        // Side-by-side: image fills the left third (40% on mobile so the
        // meta still has breathing room when the column is narrow).
        return (
            <Card className={cardBase} onClick={onCardClick}>
                <div className="flex">
                    <div className="w-2/5 sm:w-1/3 shrink-0">{imageBlock}</div>
                    <div
                        className={cn(
                            "flex-1 min-w-0 flex flex-col",
                            density.pad,
                            density.rowGap,
                        )}
                    >
                        {headerStrip}
                        {titleBlock}
                        {bodyBlock}
                    </div>
                </div>
                {footerBlock}
            </Card>
        );
    }

    // Stacked: optional image banner, then header, title, body.
    return (
        <Card className={cardBase} onClick={onCardClick}>
            {imageBlock}
            <div
                className={cn(
                    "flex flex-col",
                    density.pad,
                    density.rowGap,
                )}
            >
                {headerStrip}
                {/* When the title is rendered as image-overlay, don't
                    duplicate it underneath. */}
                {!useTitleOverlay && titleBlock}
                {bodyBlock}
            </div>
            {footerBlock}
        </Card>
    );
}

// ─── Body row renderer ──────────────────────────────────────────────────────
interface BodyRowProps {
    field: FieldSchema;
    value: any;
    relationOptions: Record<string, any[]>;
    onBooleanToggle: (fieldName: string, newValue: boolean) => void;
    disableBooleanToggle: boolean;
    mode: CardLayoutConfig["fieldDisplay"];
    showLabel: boolean;
}

function BodyRow({
    field,
    value,
    relationOptions,
    onBooleanToggle,
    disableBooleanToggle,
    mode,
    showLabel,
}: BodyRowProps) {
    const valueNode = (
        <CardFieldValue
            field={field}
            value={value}
            relationOptions={relationOptions}
            disableBooleanToggle={disableBooleanToggle}
            onBooleanToggle={onBooleanToggle}
        />
    );

    // value-only OR (showLabel === false) → render bare value
    if (mode === "value-only" || !showLabel) {
        return <div className="min-w-0 text-sm">{valueNode}</div>;
    }

    if (mode === "stacked") {
        return (
            <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {field.label}
                </span>
                <div className="min-w-0">{valueNode}</div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-2 min-w-0">
            <span className="text-xs font-medium text-muted-foreground min-w-[80px] shrink-0 pt-0.5 truncate">
                {field.label}
            </span>
            <div className="min-w-0 flex-1">{valueNode}</div>
        </div>
    );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function coerceUrl(value: unknown): string | null {
    if (value === null || value === undefined || value === "") return null;
    const s = String(value).trim();
    if (!s) return null;
    return s;
}

// ─── Image placeholder ──────────────────────────────────────────────────────

/**
 * Stable 32-bit string hash. Used to derive a consistent hue from a
 * row's identity so the same record always paints the same placeholder
 * gradient — a row's "visual fingerprint" survives across renders /
 * sort orders / page jumps.
 */
function hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
}

/**
 * Gradient-with-initial placeholder shown when:
 *   - the image field is unset, OR
 *   - the URL fails to load (the `<img>` `onError` hides the image so
 *     this layer shows through — no flicker, no extra state)
 *
 * Visual idea: derive a hue from the row's ID so each record gets a
 * unique-but-stable color. Render a big initial letter from the title
 * (or a generic icon when no title is set). Reads as intentional
 * branding rather than "missing image".
 */
function ImagePlaceholder({
    seed,
    label,
}: {
    seed: string;
    label?: string;
}) {
    const hue = hashCode(seed || "default") % 360;
    const hue2 = (hue + 50) % 360;
    const initial = (label || "").trim().charAt(0).toUpperCase();

    return (
        <div
            className="absolute inset-0 flex items-center justify-center select-none"
            style={{
                background: `linear-gradient(135deg, oklch(0.72 0.13 ${hue}), oklch(0.55 0.17 ${hue2}))`,
            }}
            aria-hidden
        >
            {initial ? (
                <span
                    className="text-white/95 text-5xl font-bold tracking-tighter"
                    style={{
                        textShadow: "0 2px 8px rgba(0,0,0,0.25)",
                    }}
                >
                    {initial}
                </span>
            ) : (
                <ImageIcon size={32} className="text-white/70" />
            )}
        </div>
    );
}
