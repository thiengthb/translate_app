import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Globe, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { GuestLayout } from "@/components/layout/GuestLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePublicModules } from "@/hooks/usePublicModules";
import { useTranslation } from "@/contexts/I18nContext";
import { iconMap } from "@/components/datatable/iconMap";
import type { MessageKey } from "@/i18n";

function resolveIcon(name?: string) {
    const key: keyof typeof iconMap =
        name && name in iconMap ? (name as keyof typeof iconMap) : "menu";
    return iconMap[key];
}

const HIGHLIGHTS: Array<{
    icon: typeof ShieldCheck;
    titleKey: MessageKey;
    descKey: MessageKey;
}> = [
    {
        icon: ShieldCheck,
        titleKey: "landing.highlightsRbacTitle",
        descKey: "landing.highlightsRbacDescription",
    },
    {
        icon: Zap,
        titleKey: "landing.highlightsPerfTitle",
        descKey: "landing.highlightsPerfDescription",
    },
    {
        icon: Globe,
        titleKey: "landing.highlightsMultiTitle",
        descKey: "landing.highlightsMultiDescription",
    },
];

export default function LandingPage() {
    const navigate = useNavigate();
    const { data: publicModules = [], isLoading } = usePublicModules();
    const { t } = useTranslation();

    return (
        <GuestLayout>
            <section className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
                <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
                    <div className="max-w-3xl">
                        <Badge variant="secondary" className="gap-1.5 mb-5">
                            <Sparkles size={12} className="text-primary" />
                            {t("landing.heroBadge")}
                        </Badge>
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                            {t("landing.heroTitleA")}<br />
                            {t("landing.heroTitleB")}{" "}
                            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                {t("landing.heroTitleHighlight")}
                            </span>
                        </h1>
                        <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
                            {t("landing.heroSubtitle")}
                        </p>
                        <div className="mt-8 flex flex-wrap gap-3">
                            <Button size="lg" onClick={() => navigate("/register")} className="gap-2">
                                {t("landing.ctaStart")}
                                <ArrowRight size={16} />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                onClick={() => navigate("/login")}
                            >
                                {t("landing.signIn")}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {HIGHLIGHTS.map((h) => (
                        <div
                            key={h.titleKey}
                            className="flex flex-col gap-3 p-6 rounded-2xl border bg-card hover:shadow-md transition-shadow"
                        >
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <h.icon size={20} />
                            </div>
                            <h3 className="font-semibold text-foreground">{t(h.titleKey)}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {t(h.descKey)}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
                <div className="flex flex-col items-center text-center mb-12">
                    <Badge variant="secondary" className="mb-3">
                        {t("landing.publicSectionBadge")}
                    </Badge>
                    <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                        {t("landing.publicSectionTitle")}
                    </h2>
                    <p className="mt-3 text-muted-foreground max-w-2xl">
                        {t("landing.publicSectionSubtitle")}
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-44 rounded-2xl bg-muted/60 animate-pulse" />
                        ))}
                    </div>
                ) : publicModules.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        {t("landing.publicSectionEmpty")}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {publicModules
                            .filter((m) => !!m.url)
                            .map((m) => {
                                const Icon = resolveIcon(m.icon);
                                return (
                                    <Link
                                        key={m.id}
                                        to={m.url!}
                                        className="group block"
                                    >
                                        <Card className="h-full hover:border-primary/40 hover:shadow-lg transition-all">
                                            <CardHeader>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                        <Icon size={22} />
                                                    </div>
                                                    <ArrowRight
                                                        size={16}
                                                        className="text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all"
                                                    />
                                                </div>
                                                <CardTitle className="mt-3 text-lg">
                                                    {m.title}
                                                </CardTitle>
                                                {m.description && (
                                                    <CardDescription className="line-clamp-2">
                                                        {m.description}
                                                    </CardDescription>
                                                )}
                                            </CardHeader>
                                            <CardContent>
                                                <span className="text-xs text-primary font-medium inline-flex items-center gap-1">
                                                    {t("landing.publicSectionExplore")}
                                                    <ArrowRight size={11} />
                                                </span>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                );
                            })}
                    </div>
                )}
            </section>

            <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20">
                <div className="rounded-3xl bg-gradient-to-br from-primary to-primary/70 p-8 sm:p-12 text-primary-foreground relative overflow-hidden">
                    <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative max-w-2xl">
                        <h2 className="text-3xl sm:text-4xl font-bold">
                            {t("landing.ctaSectionTitle")}
                        </h2>
                        <p className="mt-3 text-primary-foreground/90 text-lg">
                            {t("landing.ctaSectionSubtitle")}
                        </p>
                        <div className="mt-6 flex flex-wrap gap-3">
                            <Button
                                size="lg"
                                variant="secondary"
                                onClick={() => navigate("/register")}
                                className="gap-2"
                            >
                                {t("landing.ctaSectionRegister")}
                                <ArrowRight size={16} />
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
                                onClick={() => navigate("/login")}
                            >
                                {t("landing.signIn")}
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
