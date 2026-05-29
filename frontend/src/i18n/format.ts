import { useMemo } from "react";
import { useTranslation } from "@/contexts/I18nContext";
import type { Locale } from "@/i18n";

/**
 * Locale-aware formatting helpers built on top of the platform Intl APIs.
 *
 * The {@link useFormat} hook resolves the current locale from {@link useTranslation}
 * and exposes memoised formatters. Standalone functions take an explicit locale
 * for places that can't use a hook (utility code, redux selectors, etc.).
 *
 * Why not date-fns? Two reasons:
 *   1. Intl is zero-dependency and ships with the browser.
 *   2. date-fns locale packs would have to be added per language; Intl just
 *      works for every locale tag the runtime supports.
 */

type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
    if (value === null || value === undefined || value === "") return null;
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(
    value: DateInput,
    locale: Locale,
    options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
    const d = toDate(value);
    if (!d) return "—";
    return new Intl.DateTimeFormat(locale, options).format(d);
}

export function formatDateTime(
    value: DateInput,
    locale: Locale,
    options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
    return formatDate(value, locale, options);
}

/**
 * "2 hours ago" / "2 giờ trước" / "2時間前". Picks the largest fitting unit
 * automatically. Returns absolute date for anything older than a week.
 */
export function formatRelativeTime(value: DateInput, locale: Locale): string {
    const d = toDate(value);
    if (!d) return "—";

    const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
    const absSec = Math.abs(diffSec);

    if (absSec > 60 * 60 * 24 * 7) {
        return formatDate(d, locale);
    }

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
        ["year", 60 * 60 * 24 * 365],
        ["month", 60 * 60 * 24 * 30],
        ["week", 60 * 60 * 24 * 7],
        ["day", 60 * 60 * 24],
        ["hour", 60 * 60],
        ["minute", 60],
        ["second", 1],
    ];

    for (const [unit, secondsInUnit] of ranges) {
        if (absSec >= secondsInUnit || unit === "second") {
            return rtf.format(Math.round(diffSec / secondsInUnit), unit);
        }
    }
    return rtf.format(0, "second");
}

export function formatNumber(
    value: number | null | undefined,
    locale: Locale,
    options?: Intl.NumberFormatOptions,
): string {
    if (value === null || value === undefined || Number.isNaN(value)) return "—";
    return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrency(
    value: number | null | undefined,
    locale: Locale,
    currency: string,
): string {
    return formatNumber(value, locale, { style: "currency", currency });
}

const BYTE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const;

export function formatBytes(
    bytes: number | null | undefined,
    locale: Locale,
): string {
    if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return "—";
    if (bytes === 0) return formatNumber(0, locale) + " B";
    const i = Math.min(
        Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)),
        BYTE_UNITS.length - 1,
    );
    const value = bytes / Math.pow(1024, i);
    return `${formatNumber(value, locale, { maximumFractionDigits: 1 })} ${BYTE_UNITS[i]}`;
}

/**
 * Hook variant — auto-binds to the active locale. Use this inside components
 * so formatters re-render when the user changes language.
 */
export function useFormat() {
    const { locale } = useTranslation();
    return useMemo(
        () => ({
            date: (v: DateInput, options?: Intl.DateTimeFormatOptions) =>
                formatDate(v, locale, options),
            dateTime: (v: DateInput, options?: Intl.DateTimeFormatOptions) =>
                formatDateTime(v, locale, options),
            relative: (v: DateInput) => formatRelativeTime(v, locale),
            number: (v: number | null | undefined, options?: Intl.NumberFormatOptions) =>
                formatNumber(v, locale, options),
            currency: (v: number | null | undefined, currency: string) =>
                formatCurrency(v, locale, currency),
            bytes: (v: number | null | undefined) => formatBytes(v, locale),
        }),
        [locale],
    );
}
