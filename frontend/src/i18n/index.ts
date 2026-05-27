import { en, type MessageKey, type Messages } from "./messages/en";
import { vi } from "./messages/vi";

export const MESSAGES = { en, vi } as const;

export type Locale = keyof typeof MESSAGES;

export interface LocaleOption {
    code: Locale;
    /** Translation key for the locale's display name — resolved via `t()`. */
    labelKey: MessageKey;
    /** Short identifier shown in compact UIs (header, badges). */
    short: string;
    flag: string;
}

export const LOCALES: readonly LocaleOption[] = [
    { code: "en", labelKey: "language.en", short: "EN", flag: "🇬🇧" },
    { code: "vi", labelKey: "language.vi", short: "VI", flag: "🇻🇳" },
] as const;

export const DEFAULT_LOCALE: Locale = "en";

export function isLocale(value: unknown): value is Locale {
    return typeof value === "string" && value in MESSAGES;
}

export type { Messages, MessageKey };
