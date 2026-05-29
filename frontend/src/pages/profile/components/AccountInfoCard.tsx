import { BadgeCheck, CalendarDays, Hash, IdCard, Shield } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "@/contexts/I18nContext";
import { useFormat } from "@/i18n/format";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { ProfileResponse } from "@/types/features/profile";

interface Props {
    profile: ProfileResponse | null;
}

export function AccountInfoCard({ profile }: Props) {
    const { t } = useTranslation();
    const fmt = useFormat();
    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <IdCard size={16} className="text-primary" />
                    {t("profile.account.title")}
                </CardTitle>
                <CardDescription>{t("profile.account.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <InfoRow icon={<Hash size={14} />} label={t("profile.account.id")}>
                    <span className="font-mono text-foreground">#{profile?.id}</span>
                </InfoRow>
                <Separator />
                <InfoRow icon={<BadgeCheck size={14} />} label={t("profile.account.status")}>
                    <Badge
                        variant="secondary"
                        className="bg-green-500/15 text-green-600 dark:text-green-400 border-0"
                    >
                        {t("profile.account.active")}
                    </Badge>
                </InfoRow>
                <Separator />
                <InfoRow icon={<Shield size={14} />} label={t("profile.account.roles")}>
                    <div className="flex gap-1 flex-wrap justify-end">
                        {(profile?.roles ?? []).map((r) => (
                            <Badge key={r} variant="outline" className="text-[11px]">
                                {formatRoleLabel(r)}
                            </Badge>
                        ))}
                    </div>
                </InfoRow>
                <Separator />
                <InfoRow icon={<CalendarDays size={14} />} label={t("profile.account.createdAt")}>
                    <span className="text-foreground text-sm">{fmt.dateTime(profile?.createdAt)}</span>
                </InfoRow>
            </CardContent>
        </Card>
    );
}

function InfoRow({
    icon,
    label,
    children,
}: {
    icon: React.ReactNode;
    label: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                {icon}
                {label}
            </span>
            <div className="text-right text-sm">{children}</div>
        </div>
    );
}
