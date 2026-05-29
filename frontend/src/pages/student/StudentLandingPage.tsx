import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "@/contexts/I18nContext";
import { formatRoleLabel } from "@/utils/rbac.utils";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { MessageKey } from "@/i18n";

const CHECKLIST: Array<{ titleKey: MessageKey; textKey: MessageKey }> = [
    { titleKey: "student.checklistOpenTitle", textKey: "student.checklistOpenText" },
    { titleKey: "student.checklistViewTitle", textKey: "student.checklistViewText" },
];

export default function StudentLandingPage() {
    const { user, activeRole, hasPermission } = usePermissions();
    const { t } = useTranslation();

    const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
    const canReadBooks = hasPermission("BOOK_READ");

    return (
        <MainLayout>
            <section className="relative overflow-hidden rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50 via-cyan-50 to-emerald-50 p-6 sm:p-8">
                <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-cyan-200/50 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-16 -left-8 h-44 w-44 rounded-full bg-emerald-200/50 blur-3xl" />

                <motion.div
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative"
                    style={{ fontFamily: '"Space Grotesk", "Segoe UI", sans-serif' }}
                >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <Badge className="bg-sky-600 text-white hover:bg-sky-600">
                            {formatRoleLabel(activeRole ?? "STUDENT")}
                        </Badge>
                        <Badge variant="secondary" className="bg-background/80 text-foreground">
                            {t("student.badge")}
                        </Badge>
                    </div>

                    <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                        {t("student.welcome", { name: displayName })}
                    </h1>
                    <p className="mt-3 max-w-2xl text-sm text-foreground sm:text-base">
                        {t("student.intro")}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                        {canReadBooks ? (
                            <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                                <Link to="/books">
                                    {t("student.openBooks")}
                                    <ArrowRight className="ml-2 size-4" />
                                </Link>
                            </Button>
                        ) : (
                            <Button disabled variant="outline" className="border-border bg-background/80">
                                {t("student.noPermission")}
                            </Button>
                        )}
                    </div>
                </motion.div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                {CHECKLIST.map((item, index) => (
                    <motion.article
                        key={item.titleKey}
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.1 + index * 0.08, ease: "easeOut" }}
                        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                        style={{ fontFamily: '"DM Sans", "Segoe UI", sans-serif' }}
                    >
                        <div className="inline-flex rounded-xl bg-muted p-2 text-muted-foreground">
                            <CheckCircle2 className="size-5" />
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-foreground">{t(item.titleKey)}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(item.textKey)}</p>
                    </motion.article>
                ))}
            </section>

            <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.45 }}
                className="mt-6 rounded-2xl border border-border bg-card p-5"
            >
                <div className="flex items-center gap-3 text-foreground">
                    <BookOpen className="size-5" />
                    <p className="text-sm">{t("student.contact")}</p>
                </div>
            </motion.section>
        </MainLayout>
    );
}
