import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "@/contexts/I18nContext";
import { formatRoleLabel } from "@/utils/rbac.utils";
import { motion } from "motion/react";

export default function TeacherLandingPage() {
    const { user, activeRole } = usePermissions();
    const { t } = useTranslation();

    const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

    return (
        <MainLayout>
            <div className="w-full">
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
            </motion.section>
            </div>
        </MainLayout>
    );
}
