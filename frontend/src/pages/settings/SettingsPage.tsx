import {
    Check,
    Languages,
    Monitor,
    Moon,
    Palette,
    Sun,
    Type,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Card } from "@/components/ui/card";

import { useTranslation } from "@/contexts/I18nContext";
import { useColorPreset } from "@/hooks/useColorPreset";
import {
    useThemePreference,
    type ThemePreference,
} from "@/hooks/useThemePreference";
import { useTypography } from "@/hooks/useTypography";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n";

const THEME_MODES: Array<{
    value: ThemePreference;
    label: string;
    Icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
    { value: "light", label: "Sáng", Icon: Sun },
    { value: "dark", label: "Tối", Icon: Moon },
    { value: "system", label: "Hệ thống", Icon: Monitor },
];

/**
 * Settings page — `/settings`.
 *
 * Layout strategy: the page consumes the full width of the main layout
 * (no centered `max-w-*` constraint) and arranges sections in a
 * responsive grid so high-resolution monitors don't waste horizontal
 * space.
 *
 *   Row 1 (lg+):  ┌── Giao diện ──────────┬── Ngôn ngữ ──┐
 *                 │  3 buttons             │  N buttons   │
 *                 └────────────────────────┴──────────────┘
 *   Row 2:        ┌── Màu chủ đạo (12 presets) ─────────────────┐
 *                 └─────────────────────────────────────────────┘
 *   Row 3:        ┌── Kiểu chữ ─────────  Mật độ: [G][D][T] ───┐
 *                 │  12 font cards with live "Aa" preview       │
 *                 └─────────────────────────────────────────────┘
 *
 * All state lives in existing hooks (`useThemePreference`,
 * `useColorPreset`, `useTypography`, `useTranslation`) so changes apply
 * globally and persist across reloads + tabs.
 */
export default function SettingsPage() {
    return (
        <MainLayout pathName={{ "/settings": "Cài đặt" }}>
            <div className="w-full flex flex-col gap-4 pb-6">
                {/* Theme + Language paired at the top — they share the
                    "small switcher" pattern and pack neatly side-by-side
                    on wide screens. */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-3">
                        <ThemeModeSection />
                    </div>
                    <div className="lg:col-span-2">
                        <LanguageSection />
                    </div>
                </div>

                <ColorPresetSection />
                <TypographySection />
            </div>
        </MainLayout>
    );
}

// ─── Theme mode (light/dark/system) ─────────────────────────────────────────
function ThemeModeSection() {
    const { themePreference, setThemePreference } = useThemePreference();

    return (
        <SectionCard
            icon={<Sun size={16} />}
            title="Giao diện"
            description="Sáng, tối, hoặc theo hệ điều hành."
        >
            <div className="grid grid-cols-3 gap-2">
                {THEME_MODES.map(({ value, label, Icon }) => {
                    const active = themePreference === value;
                    return (
                        <SelectCard
                            key={value}
                            active={active}
                            onClick={() => setThemePreference(value)}
                            className="flex-col items-center text-center py-4"
                        >
                            <span
                                className={cn(
                                    "inline-flex h-9 w-9 items-center justify-center rounded-full",
                                    active
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground",
                                )}
                            >
                                <Icon size={16} />
                            </span>
                            <span className="text-sm font-medium">{label}</span>
                        </SelectCard>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Color preset (12 swatches) ─────────────────────────────────────────────
function ColorPresetSection() {
    const { presetId, setPreset } = useColorPreset();

    return (
        <SectionCard
            icon={<Palette size={16} />}
            title="Màu chủ đạo"
            description="Tông màu chính của toàn ứng dụng."
        >
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {COLOR_PRESETS.map((p) => {
                    const active = presetId === p.id;
                    return (
                        <SelectCard
                            key={p.id}
                            active={active}
                            onClick={() => setPreset(p.id)}
                            title={p.description}
                            className="flex-col items-center text-center py-3 gap-2"
                        >
                            {/* Swatch with a subtle inner ring to give
                                light-colored swatches (Amber) edges
                                against a white card. */}
                            <span
                                className="h-9 w-9 rounded-full shrink-0 shadow-inner ring-1 ring-black/10 dark:ring-white/10"
                                style={{ backgroundColor: p.swatch }}
                                aria-hidden
                            />
                            <span className="text-xs font-medium leading-tight">
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
            icon={<Type size={16} />}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {families.map((f) => {
                    const active = familyId === f.id;
                    return (
                        <SelectCard
                            key={f.id}
                            active={active}
                            onClick={() => setFamily(f.id)}
                            title={f.description}
                            className="flex-col items-stretch text-center py-3 gap-1.5"
                        >
                            {/* Live preview rendered in the actual font so
                                users can compare typefaces side-by-side
                                without flipping the global setting.
                                "Aa" exercises Latin shapes; the
                                Vietnamese sample shows diacritic
                                rendering. */}
                            <span
                                className="text-2xl leading-none font-semibold tracking-tight"
                                style={{ fontFamily: f.family }}
                            >
                                Aa
                            </span>
                            <span
                                className="text-[11px] leading-tight text-muted-foreground truncate"
                                style={{ fontFamily: f.family }}
                            >
                                Đường Sáng
                            </span>
                            <span className="text-xs font-medium truncate mt-0.5">
                                {f.name}
                            </span>
                        </SelectCard>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Language ───────────────────────────────────────────────────────────────
function LanguageSection() {
    const { locale, setLocale, locales, t } = useTranslation();

    return (
        <SectionCard
            icon={<Languages size={16} />}
            title="Ngôn ngữ"
            description="Ngôn ngữ hiển thị."
        >
            <div
                className={cn(
                    "grid gap-2",
                    locales.length <= 2
                        ? "grid-cols-2"
                        : "grid-cols-2 sm:grid-cols-3",
                )}
            >
                {locales.map((l) => {
                    const active = l.code === locale;
                    return (
                        <SelectCard
                            key={l.code}
                            active={active}
                            onClick={() => setLocale(l.code as Locale)}
                            className="flex-col items-center text-center py-4 gap-1.5"
                        >
                            <span className="text-2xl leading-none" aria-hidden>
                                {l.flag}
                            </span>
                            <span className="text-sm font-medium leading-tight">
                                {t(l.labelKey)}
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
                "relative flex items-center gap-2 rounded-lg border p-2.5 transition-all cursor-pointer",
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
                    size={12}
                    strokeWidth={3}
                    className="absolute top-1.5 right-1.5 text-primary"
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
 * Section card shell with icon header + optional right-aligned actions
 * slot (used by Typography to surface the density segmented control
 * inline with the title).
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
        <Card className="p-4 sm:p-5 gap-3 sm:gap-4 h-full">
            <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {icon}
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-sm font-semibold text-foreground leading-tight">
                            {title}
                        </h2>
                        <p className="text-xs text-muted-foreground truncate">
                            {description}
                        </p>
                    </div>
                </div>
                {actions}
            </div>
            {children}
        </Card>
    );
}
