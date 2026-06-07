import { Check, Palette, Type } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { InfoCard } from "@/components/common/InfoCard";

import { useColorPreset } from "@/hooks/useColorPreset";
import { useTypography } from "@/hooks/useTypography";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { cn } from "@/lib/utils";

/**
 * Settings page — `/settings`.
 *
 * Mirrors the Profile page shell: a full-width column with `gap-6`
 * between Cards (same `Card` / `CardHeader` / `CardTitle` /
 * `CardDescription` primitives) so the two pages feel like siblings.
 *
 *   Row 1:        ┌── Màu chủ đạo (12 presets) ─────────────────┐
 *                 └─────────────────────────────────────────────┘
 *   Row 2:        ┌── Kiểu chữ ─────────  Mật độ: [G][D][T] ───┐
 *                 │  12 font cards with live "Aa" preview       │
 *                 └─────────────────────────────────────────────┘
 *
 * Theme (light/dark) moved to the header's Cool Theme Toggle and
 * language switching to the user dropdown, so neither lives here.
 * Remaining state lives in existing hooks (`useColorPreset`,
 * `useTypography`) so changes apply globally and persist across
 * reloads + tabs.
 */
export default function SettingsPage() {
    return (
        <MainLayout pathName={{ "/settings": "Cài đặt" }}>
            <div className="w-full flex flex-col gap-3">
                {/* Theme (light/dark) now lives in the header via the
                    Cool Theme Toggle; language switching moved out of
                    Settings too. Only color + typography remain here. */}
                <ColorPresetSection />
                <TypographySection />
            </div>
        </MainLayout>
    );
}

// ─── Color preset (12 swatches) ─────────────────────────────────────────────
function ColorPresetSection() {
    const { presetId, setPreset } = useColorPreset();

    return (
        <SectionCard
            icon={<Palette size={16} className="text-primary" />}
            title="Màu chủ đạo"
            description="Tông màu chính của toàn ứng dụng."
        >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                {COLOR_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                        <SelectCard
                            key={p.id}
                            active={active}
                            onClick={() => setPreset(p.id)}
                            title={p.description}
                            className="flex-col items-center text-center py-2 gap-1.5"
                        >
                            {/* Swatch with a subtle inner ring to give
                                light-colored swatches (Amber) edges
                                against a white card. */}
                            <span
                                className="h-7 w-7 rounded-full shrink-0 shadow-inner ring-1 ring-black/10 dark:ring-white/10"
                                style={{ backgroundColor: p.swatch }}
                                aria-hidden
                            />
                            <span className="text-[11px] font-medium leading-tight truncate w-full">
                                {p.name}
                            </span>
                        </SelectCard>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Typography (font family + density combined) ────────────────────────────
function TypographySection() {
    const { familyId, sizeId, setFamily, setSize, families, sizes } =
        useTypography();

    return (
        <SectionCard
            icon={<Type size={16} className="text-primary" />}
            title="Kiểu chữ"
            description="Font và mật độ — áp dụng toàn ứng dụng."
            actions={
                <SegmentedControl
                    options={sizes.map((s) => ({
                        id: s.id,
                        label: s.name,
                        title: `${s.description} (${s.size})`,
                    }))}
                    value={sizeId}
                    onChange={(id) => setSize(id as typeof sizeId)}
                />
            }
        >
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-1.5">
                {families.map((f) => {
                    const active = familyId === f.id;
                    return (
                        <SelectCard
                            key={f.id}
                            active={active}
                            onClick={() => setFamily(f.id)}
                            title={f.description}
                            className="flex-col items-stretch text-center py-2 gap-0.5"
                        >
                            {/* Live preview rendered in the actual font so
                                users can compare typefaces side-by-side
                                without flipping the global setting. */}
                            <span
                                className="text-xl leading-none font-semibold tracking-tight"
                                style={{ fontFamily: f.family }}
                            >
                                Aa
                            </span>
                            <span className="text-[11px] font-medium truncate">
                                {f.name}
                            </span>
                        </SelectCard>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Shared primitives ──────────────────────────────────────────────────────

/**
 * One radio-style selectable card. Centralized so every section gets the
 * same active state, hover, focus ring, and check indicator.
 */
function SelectCard({
    active,
    onClick,
    className,
    children,
    title,
}: {
    active: boolean;
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
    /** Native tooltip — used for descriptions we keep off-screen for density. */
    title?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={cn(
                "relative flex items-center gap-2 rounded-lg border p-2 transition-all cursor-pointer",
                "hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                active
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border",
                className,
            )}
        >
            {children}
            {active && (
                <Check
                    size={11}
                    strokeWidth={3}
                    className="absolute top-1 right-1 text-primary"
                />
            )}
        </button>
    );
}

/**
 * Compact segmented pill control — "iOS-style" button group. Used for
 * density (which has 3 options where a full radio card would feel
 * excessive). Keeps the section header tidy by docking on the right.
 */
function SegmentedControl({
    options,
    value,
    onChange,
}: {
    options: Array<{ id: string; label: string; title?: string }>;
    value: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="inline-flex shrink-0 rounded-md border border-border bg-muted/40 p-0.5">
            {options.map((o) => {
                const active = o.id === value;
                return (
                    <button
                        key={o.id}
                        type="button"
                        title={o.title}
                        onClick={() => onChange(o.id)}
                        className={cn(
                            "px-2.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer",
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

/**
 * Section card shell — thin wrapper over {@link InfoCard}. The section's
 * `description` is no longer a header row; it lives behind the ⓘ icon next
 * to the title so the card stays compact.
 */
function SectionCard({
    icon,
    title,
    description,
    actions,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <InfoCard icon={icon} title={title} info={description} actions={actions}>
            {children}
        </InfoCard>
    );
}
