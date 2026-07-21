import { Languages } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/I18nContext";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import type { Locale } from "@/i18n";

import { CardHeading, RevealCard } from "./profile-ui";

interface Props {
    index?: number;
}

export function LanguageCard({ index = 0 }: Props) {
    const { locale, setLocale, locales, t } = useTranslation();
    const reduce = usePrefersReducedMotion();

    return (
        <RevealCard index={index} reduce={reduce} className="p-5 sm:p-6">
            <CardHeading
                icon={<Languages size={18} />}
                title={t("profile.language.title")}
                info={t("profile.language.description")}
            />
            <div className="mt-5 space-y-2">
                <label className="pl-1 text-xs font-semibold text-muted-foreground" htmlFor="profile-language">
                    {t("profile.language.label")}
                </label>
                <Select value={locale} onValueChange={(next) => setLocale(next as Locale)}>
                    <SelectTrigger
                        id="profile-language"
                        className="h-12 w-full rounded-2xl border-border bg-white/70"
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {locales.map((l) => (
                            <SelectItem key={l.code} value={l.code}>
                                <span className="inline-flex items-center gap-2">
                                    <span aria-hidden>{l.flag}</span>
                                    <span>{t(l.labelKey)}</span>
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </RevealCard>
    );
}
