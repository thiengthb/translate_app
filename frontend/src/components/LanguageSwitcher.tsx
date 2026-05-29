import { Languages } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/I18nContext";
import type { Locale } from "@/i18n";

interface LanguageSwitcherProps {
    /** "icon" (default): compact button with globe icon for the navbar.
     *  "full": shows the active locale label inline — for forms/settings. */
    variant?: "icon" | "full";
    align?: "start" | "center" | "end";
}

export function LanguageSwitcher({ variant = "icon", align = "end" }: LanguageSwitcherProps) {
    const { locale, setLocale, locales, t } = useTranslation();
    const active = locales.find((l) => l.code === locale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {variant === "icon" ? (
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={t("profile.language.label")}
                        className="relative"
                    >
                        <Languages className="h-4 w-4" />
                        <span className="sr-only">{t("profile.language.label")}</span>
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Languages className="h-4 w-4" />
                        <span>{active ? t(active.labelKey) : locale.toUpperCase()}</span>
                    </Button>
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="min-w-[10rem]">
                <DropdownMenuLabel>{t("profile.language.title")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {locales.map((l) => (
                    <DropdownMenuCheckboxItem
                        key={l.code}
                        checked={l.code === locale}
                        onCheckedChange={(checked) => {
                            if (checked) setLocale(l.code as Locale);
                        }}
                        className="gap-2"
                    >
                        <span aria-hidden>{l.flag}</span>
                        <span>{t(l.labelKey)}</span>
                    </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
