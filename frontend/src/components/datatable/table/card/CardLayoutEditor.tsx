import { Check, LayoutPanelTop, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { FieldSchema } from "@/types/common/datatable";

import {
    CARD_LAYOUT_PRESETS,
    type CardLayoutConfig,
    type UseCardLayoutResult,
} from "./useCardLayout";

interface CardLayoutEditorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cardLayout: UseCardLayoutResult;
    visibleFields: FieldSchema[];
}

// ─── Choice tables — declarative so adding a new option is a one-liner ────

type Choice<T extends string | number> = { id: T; label: string; hint?: string };

const IMAGE_POSITIONS: Choice<CardLayoutConfig["imagePosition"]>[] = [
    { id: "top", label: "Trên" },
    { id: "left", label: "Trái" },
    { id: "hidden", label: "Ẩn" },
];

const IMAGE_ASPECTS: Choice<CardLayoutConfig["imageAspect"]>[] = [
    { id: "square", label: "1:1" },
    { id: "video", label: "16:9" },
    { id: "wide", label: "21:9" },
    { id: "portrait", label: "3:4" },
];

const IMAGE_FITS: Choice<CardLayoutConfig["imageFit"]>[] = [
    { id: "cover", label: "Cover", hint: "Lấp đầy, cắt phần thừa" },
    { id: "contain", label: "Contain", hint: "Hiện hết, có viền nền" },
];

const TITLE_SIZES: Choice<CardLayoutConfig["titleSize"]>[] = [
    { id: "sm", label: "S" },
    { id: "md", label: "M" },
    { id: "lg", label: "L" },
];

const TITLE_ALIGNS: Choice<CardLayoutConfig["titleAlign"]>[] = [
    { id: "left", label: "Trái" },
    { id: "center", label: "Giữa" },
];

const DISPLAY_MODES: Choice<CardLayoutConfig["fieldDisplay"]>[] = [
    { id: "inline", label: "Cùng dòng" },
    { id: "stacked", label: "Xếp dọc" },
    { id: "value-only", label: "Chỉ giá trị" },
];

const RADII: Choice<CardLayoutConfig["cardRadius"]>[] = [
    { id: "sharp", label: "Sharp" },
    { id: "default", label: "Bo" },
    { id: "soft", label: "Mềm" },
];

const SHADOWS: Choice<CardLayoutConfig["cardShadow"]>[] = [
    { id: "none", label: "Không" },
    { id: "subtle", label: "Nhẹ" },
    { id: "lifted", label: "Nổi" },
];

const BORDERS: Choice<CardLayoutConfig["cardBorder"]>[] = [
    { id: "none", label: "Không" },
    { id: "subtle", label: "Nhẹ" },
    { id: "accent", label: "Đậm" },
];

const DENSITIES: Choice<CardLayoutConfig["cardDensity"]>[] = [
    { id: "compact", label: "Gọn" },
    { id: "normal", label: "BT" },
    { id: "cozy", label: "Thoáng" },
];

const ACTIONS_POSITIONS: Choice<CardLayoutConfig["actionsPosition"]>[] = [
    { id: "header", label: "Header" },
    { id: "footer", label: "Footer" },
    { id: "hover", label: "Hover" },
];

const GRID_COLS: Choice<CardLayoutConfig["gridColumns"]>[] = [
    { id: 0, label: "Auto" },
    { id: 1, label: "1" },
    { id: 2, label: "2" },
    { id: 3, label: "3" },
    { id: 4, label: "4" },
    { id: 6, label: "6" },
];

/**
 * Comprehensive card-layout editor docked as a right-side sheet.
 *
 * Design intent:
 *   - **Non-modal** (`modal={false}`): no overlay dimming, no scroll
 *     lock. The user keeps full visual + interactive access to the
 *     actual cards behind the panel — they ARE the live preview.
 *   - **Wide enough to be usable** (440px): wider than the default
 *     Sheet so segmented controls fit on one line.
 *   - **Section-driven**: each visual concern (preset, image, title,
 *     body, surface, actions, grid) sits in its own header-stamped
 *     block so users can scan to the area they want to tweak.
 *
 * Every control writes through `cardLayout.update()` → localStorage →
 * the surrounding ProTable's `<CardView>` re-renders in real time.
 */
export function CardLayoutEditor({
    open,
    onOpenChange,
    cardLayout,
    visibleFields,
}: CardLayoutEditorProps) {
    const { config, update, resetToDefault, applyPreset, meta } = cardLayout;

    const toggleBodyField = (name: string) => {
        const enabled = config.bodyFields.includes(name);
        update(
            "bodyFields",
            enabled
                ? config.bodyFields.filter((n) => n !== name)
                : [...config.bodyFields, name],
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
            <SheetContent
                side="right"
                /* Width override: default shadcn Sheet caps at sm:max-w-sm
                   (24rem). Bump to 440px so the segmented controls and
                   field-toggle grid never wrap awkwardly. */
                className="w-full sm:!max-w-[440px] p-0 gap-0 flex flex-col"
                /* Don't trap focus or auto-close on outside click — user
                   may want to click the cards behind to see how state
                   like "selected" responds with the new layout. */
                onInteractOutside={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
            >
                <SheetHeader className="border-b p-4 shrink-0">
                    <SheetTitle className="flex items-center gap-2 text-base">
                        <LayoutPanelTop size={18} className="text-primary" />
                        Tùy chỉnh card
                    </SheetTitle>
                    <SheetDescription className="text-xs">
                        Thay đổi áp dụng ngay vào các card phía sau. Lưu cục bộ
                        theo entity.
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 min-h-0">
                    <div className="p-4 space-y-5">
                        {/* ── Presets ───────────────────────────────────── */}
                        <Section
                            title="Preset"
                            icon={<Sparkles size={12} />}
                            description="Bắt đầu nhanh — sẽ ghi đè cấu hình hiện tại."
                        >
                            <div className="grid grid-cols-2 gap-1.5">
                                {CARD_LAYOUT_PRESETS.map((p) => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        onClick={() => applyPreset(p.id)}
                                        className={cn(
                                            "flex flex-col items-start gap-0.5 rounded-md border p-2 text-left transition-colors cursor-pointer",
                                            "hover:bg-accent/50 border-border",
                                        )}
                                    >
                                        <span className="text-xs font-semibold leading-tight">
                                            {p.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground leading-tight">
                                            {p.description}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </Section>

                        {/* ── Image ─────────────────────────────────────── */}
                        <Section title="Hình ảnh">
                            <Field label="Vị trí">
                                <Segmented
                                    options={IMAGE_POSITIONS}
                                    value={config.imagePosition}
                                    onChange={(v) => update("imagePosition", v)}
                                />
                            </Field>

                            {config.imagePosition !== "hidden" && (
                                <>
                                    <Field label="Field hình">
                                        <FieldSelect
                                            fields={meta.imageCandidates}
                                            value={config.imageField}
                                            onChange={(v) => update("imageField", v)}
                                            placeholder={
                                                meta.imageCandidates.length
                                                    ? "Chọn field"
                                                    : "Entity không có field hình"
                                            }
                                            disabled={
                                                meta.imageCandidates.length === 0
                                            }
                                            allowNone
                                        />
                                    </Field>
                                    <Field label="Tỉ lệ">
                                        <Segmented
                                            options={IMAGE_ASPECTS}
                                            value={config.imageAspect}
                                            onChange={(v) => update("imageAspect", v)}
                                        />
                                    </Field>
                                    <Field label="Fit">
                                        <Segmented
                                            options={IMAGE_FITS}
                                            value={config.imageFit}
                                            onChange={(v) => update("imageFit", v)}
                                        />
                                    </Field>
                                    {config.imagePosition === "top" && (
                                        <Toggle
                                            label="Đè title lên ảnh"
                                            hint="Gradient + chữ trắng — phong cách banner"
                                            value={config.titleOnImage}
                                            onChange={(v) =>
                                                update("titleOnImage", v)
                                            }
                                        />
                                    )}
                                </>
                            )}
                        </Section>

                        {/* ── Title ─────────────────────────────────────── */}
                        <Section title="Tiêu đề">
                            <Field label="Title">
                                <FieldSelect
                                    fields={meta.titleCandidates}
                                    value={config.titleField}
                                    onChange={(v) => update("titleField", v)}
                                    allowNone
                                />
                            </Field>
                            <Field label="Subtitle">
                                <FieldSelect
                                    fields={meta.titleCandidates}
                                    value={config.subtitleField}
                                    onChange={(v) => update("subtitleField", v)}
                                    allowNone
                                />
                            </Field>
                            <Field label="Cỡ chữ">
                                <Segmented
                                    options={TITLE_SIZES}
                                    value={config.titleSize}
                                    onChange={(v) => update("titleSize", v)}
                                />
                            </Field>
                            <Field label="Căn">
                                <Segmented
                                    options={TITLE_ALIGNS}
                                    value={config.titleAlign}
                                    onChange={(v) => update("titleAlign", v)}
                                />
                            </Field>
                        </Section>

                        {/* ── Body ──────────────────────────────────────── */}
                        <Section
                            title="Thân card"
                            description={`${
                                config.bodyFields.filter(
                                    (n) =>
                                        n !== config.titleField &&
                                        n !== config.subtitleField &&
                                        n !== config.imageField,
                                ).length
                            }/${meta.bodyCandidates.length} field đang hiển thị.`}
                        >
                            <Field label="Hiển thị field">
                                <Segmented
                                    options={DISPLAY_MODES}
                                    value={config.fieldDisplay}
                                    onChange={(v) => update("fieldDisplay", v)}
                                />
                            </Field>
                            <Toggle
                                label="Hiện nhãn"
                                value={config.showLabels}
                                onChange={(v) => update("showLabels", v)}
                            />

                            <div className="space-y-1">
                                <Label>Field hiển thị</Label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {meta.bodyCandidates.map((f) => {
                                        const promoted =
                                            f.name === config.titleField ||
                                            f.name === config.subtitleField ||
                                            f.name === config.imageField;
                                        const enabled =
                                            !promoted &&
                                            config.bodyFields.includes(f.name);
                                        return (
                                            <button
                                                key={f.name}
                                                type="button"
                                                disabled={promoted}
                                                onClick={() =>
                                                    toggleBodyField(f.name)
                                                }
                                                title={
                                                    promoted
                                                        ? "Đã dùng ở title/subtitle/image"
                                                        : undefined
                                                }
                                                className={cn(
                                                    "flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors",
                                                    promoted &&
                                                        "opacity-40 cursor-not-allowed",
                                                    !promoted &&
                                                        (enabled
                                                            ? "border-primary bg-primary/5 text-primary"
                                                            : "border-border hover:bg-accent/50 cursor-pointer"),
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "h-3.5 w-3.5 rounded-sm border flex items-center justify-center shrink-0",
                                                        enabled
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "border-muted-foreground/40 bg-background",
                                                    )}
                                                >
                                                    {enabled && (
                                                        <Check
                                                            size={10}
                                                            strokeWidth={3}
                                                        />
                                                    )}
                                                </span>
                                                <span className="truncate">
                                                    {f.label}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </Section>

                        {/* ── Surface ───────────────────────────────────── */}
                        <Section title="Kiểu card">
                            <Field label="Bo góc">
                                <Segmented
                                    options={RADII}
                                    value={config.cardRadius}
                                    onChange={(v) => update("cardRadius", v)}
                                />
                            </Field>
                            <Field label="Đổ bóng">
                                <Segmented
                                    options={SHADOWS}
                                    value={config.cardShadow}
                                    onChange={(v) => update("cardShadow", v)}
                                />
                            </Field>
                            <Field label="Viền">
                                <Segmented
                                    options={BORDERS}
                                    value={config.cardBorder}
                                    onChange={(v) => update("cardBorder", v)}
                                />
                            </Field>
                            <Field label="Mật độ">
                                <Segmented
                                    options={DENSITIES}
                                    value={config.cardDensity}
                                    onChange={(v) => update("cardDensity", v)}
                                />
                            </Field>
                        </Section>

                        {/* ── Actions ───────────────────────────────────── */}
                        <Section title="Thao tác">
                            <Toggle
                                label="Hiện nút thao tác"
                                value={config.showActions}
                                onChange={(v) => update("showActions", v)}
                            />
                            {config.showActions && (
                                <Field label="Vị trí">
                                    <Segmented
                                        options={ACTIONS_POSITIONS}
                                        value={config.actionsPosition}
                                        onChange={(v) =>
                                            update("actionsPosition", v)
                                        }
                                    />
                                </Field>
                            )}
                            <Toggle
                                label="Hiện số thứ tự (#1)"
                                value={config.showIndex}
                                onChange={(v) => update("showIndex", v)}
                            />
                        </Section>

                        {/* ── Grid ──────────────────────────────────────── */}
                        <Section title="Lưới">
                            <Field
                                label="Số cột"
                                hint="Auto = theo breakpoint (2/3/4)"
                            >
                                <Segmented
                                    options={GRID_COLS}
                                    value={config.gridColumns}
                                    onChange={(v) => update("gridColumns", v)}
                                />
                            </Field>
                        </Section>
                    </div>
                </ScrollArea>

                <SheetFooter className="border-t p-3 shrink-0 sm:flex-row sm:justify-between gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetToDefault}
                        className="gap-1.5"
                    >
                        <RotateCcw size={14} />
                        Khôi phục mặc định
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Xong
                    </Button>
                </SheetFooter>

                {/* Suppress unused-import lint when visibleFields is not
                    referenced directly here (it flows through the hook). */}
                <span className="hidden">{visibleFields.length}</span>
            </SheetContent>
        </Sheet>
    );
}

// ─── Internal primitives ────────────────────────────────────────────────────

function Section({
    title,
    description,
    icon,
    children,
}: {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="space-y-2.5">
            <header>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    {icon}
                    {title}
                </h3>
                {description && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                        {description}
                    </p>
                )}
            </header>
            <div className="space-y-2">{children}</div>
        </section>
    );
}

function Label({ children }: { children: React.ReactNode }) {
    return (
        <label className="text-xs font-medium text-muted-foreground">
            {children}
        </label>
    );
}

function Field({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <Label>{label}</Label>
            {children}
            {hint && (
                <span className="text-[10px] text-muted-foreground/80 leading-tight">
                    {hint}
                </span>
            )}
        </div>
    );
}

function Toggle({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint?: string;
    value: boolean;
    onChange: (next: boolean) => void;
}) {
    return (
        <label className="flex items-center justify-between gap-3 cursor-pointer rounded-md py-1">
            <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground">{label}</span>
                {hint && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                        {hint}
                    </span>
                )}
            </div>
            <Switch checked={value} onCheckedChange={onChange} />
        </label>
    );
}

function Segmented<T extends string | number>({
    options,
    value,
    onChange,
}: {
    options: Array<Choice<T>>;
    value: T;
    onChange: (id: T) => void;
}) {
    return (
        <div className="inline-flex w-full rounded-md border border-border bg-muted/40 p-0.5">
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button
                        key={String(o.id)}
                        type="button"
                        title={o.hint}
                        onClick={() => onChange(o.id)}
                        className={cn(
                            "flex-1 px-1.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer truncate",
                            active
                                ? "bg-background text-foreground shadow-sm"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

function FieldSelect({
    fields,
    value,
    onChange,
    placeholder = "Chọn field",
    allowNone = false,
    disabled = false,
}: {
    fields: FieldSchema[];
    value: string | null;
    onChange: (next: string | null) => void;
    placeholder?: string;
    allowNone?: boolean;
    disabled?: boolean;
}) {
    return (
        <Select
            value={value ?? "__none__"}
            onValueChange={(v) => onChange(v === "__none__" ? null : v)}
            disabled={disabled}
        >
            <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {allowNone && (
                    <SelectItem value="__none__">
                        <span className="text-muted-foreground italic">
                            — Không —
                        </span>
                    </SelectItem>
                )}
                {fields.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                        {f.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
