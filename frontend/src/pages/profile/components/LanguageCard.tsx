import { Languages } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InfoLabel } from "@/components/common/InfoLabel";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/I18nContext";
import type { Locale } from "@/i18n";

export function LanguageCard() {
    const { locale, setLocale, locales, t } = useTranslation();

    return (
        <Card className="gap-3 py-4">
            <CardHeader className="px-4 pb-0">
                <CardTitle className="text-base flex items-center gap-2">
                    <Languages size={16} className="text-primary" />
                    <InfoLabel title={t("profile.language.title")} info={t("profile.language.description")} />
                </CardTitle>
            </CardHeader>
            <CardContent className="px-4 space-y-3">
                <div className="space-y-2">
                    <label className="text-sm font-medium leading-none" htmlFor="profile-language">
                        {t("profile.language.label")}
                    </label>
                    <Select
                        value={locale}
                        onValueChange={(next) => setLocale(next as Locale)}
                    >
                        <SelectTrigger id="profile-language" className="w-full sm:w-72">
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
            </CardContent>
        </Card>
    );
}
