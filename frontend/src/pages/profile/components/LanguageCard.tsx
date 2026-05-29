import { Languages } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <Languages size={16} className="text-primary" />
                    {t("profile.language.title")}
                </CardTitle>
                <CardDescription>{t("profile.language.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
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
