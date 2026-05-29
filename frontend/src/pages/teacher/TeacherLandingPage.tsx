import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "@/contexts/I18nContext";
import { formatRoleLabel } from "@/utils/rbac.utils";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, ClipboardCheck, PenSquare } from "lucide-react";
import { Link } from "react-router-dom";
import type { MessageKey } from "@/i18n";

const TEACHER_CAPS: Array<{
    permission: string;
    labelKey: MessageKey;
    descriptionKey: MessageKey;
    icon: typeof PenSquare;
}> = [
    {
        permission: "BOOK_CREATE",
        labelKey: "teacher.capCreateTitle",
        descriptionKey: "teacher.capCreateDescription",
        icon: PenSquare,
    },
    {
        permission: "BOOK_UPDATE",
        labelKey: "teacher.capUpdateTitle",
        descriptionKey: "teacher.capUpdateDescription",
        icon: ClipboardCheck,
    },
    {
        permission: "BOOK_READ",
        labelKey: "teacher.capReadTitle",
        descriptionKey: "teacher.capReadDescription",
        icon: BookOpen,
    },
];

export default function TeacherLandingPage() {
    const { user, activeRole, hasPermission } = usePermissions();
    const { t } = useTranslation();

    const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    return (
        <MainLayout>
            <motion.section
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 p-6 sm:p-8"
            >
                <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                        {formatRoleLabel(activeRole ?? "TEACHER")}
                    </Badge>
                    <Badge variant="secondary" className="bg-background/80 text-foreground">
                        {t("teacher.badge")}
                    </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
                    {t("teacher.welcome", { name: displayName })}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-foreground sm:text-base">
                    {t("teacher.intro")}
                </p>

                <div className="mt-6">
                    <Button asChild className="bg-foreground text-background hover:bg-foreground/90">
                        <Link to="/books">
                            {t("teacher.openManagement")}
                            <ArrowRight className="ml-2 size-4" />
                        </Link>
                    </Button>
                </div>
            </motion.section>

            <section className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
                {TEACHER_CAPS.map((item, index) => {
                    const Icon = item.icon;
                    const enabled = hasPermission(item.permission);

                    return (
                        <motion.article
                            key={item.permission}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, delay: 0.1 + index * 0.08, ease: "easeOut" }}
                            className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                        >
                            <div className="inline-flex rounded-xl bg-muted p-2 text-muted-foreground">
                                <Icon className="size-5" />
                            </div>
                            <h3 className="mt-4 text-base font-semibold text-foreground">{t(item.labelKey)}</h3>
                            <p className="mt-2 text-sm text-muted-foreground">{t(item.descriptionKey)}</p>
                            <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                {enabled ? t("teacher.capEnabled") : t("teacher.capMissing")}
                            </p>
                        </motion.article>
                    );
                })}
            </section>
        </MainLayout>
    );
}
