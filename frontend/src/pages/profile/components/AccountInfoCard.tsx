import type { ReactNode } from "react";
import { BadgeCheck, CalendarClock, Hash, IdCard, Shield } from "lucide-react";
import { motion } from "motion/react";

import { useTranslation } from "@/contexts/I18nContext";
import { useFormat } from "@/i18n/format";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { ProfileResponse } from "@/types/features/profile";

import { CardHeading, RevealCard } from "./profile-ui";

interface Props {
    profile: ProfileResponse | null;
    index?: number;
}

export function AccountInfoCard({ profile, index = 0 }: Props) {
    const { t } = useTranslation();
    const fmt = useFormat();
    const reduce = usePrefersReducedMotion();

    return (
        <RevealCard index={index} reduce={reduce} className="p-5 sm:p-6">
            <CardHeading
                icon={<IdCard size={18} />}
                title={t("profile.account.title")}
                info={t("profile.account.description")}
            />

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Tile icon={<Hash size={15} />} label={t("profile.account.id")}>
                    <span className="font-mono text-base font-semibold text-foreground">
                        #{profile?.id}
                    </span>
                </Tile>

                <Tile icon={<BadgeCheck size={15} />} label={t("profile.account.status")}>
                    {/* Live, gently-floating status pill. */}
                    <motion.span
                        animate={reduce ? undefined : { y: [0, -3, 0] }}
                        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-600"
                    >
                        <span className="relative flex h-2 w-2">
                            {!reduce && (
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-70" />
                            )}
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        {t("profile.account.active")}
                    </motion.span>
                </Tile>

                <Tile icon={<Shield size={15} />} label={t("profile.account.roles")}>
                    <div className="flex flex-wrap gap-1.5">
                        {(profile?.roles ?? []).map((r) => (
                            <span
                                key={r}
                                className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary"
                            >
                                {formatRoleLabel(r)}
                            </span>
                        ))}
                    </div>
                </Tile>

                <Tile icon={<CalendarClock size={15} />} label={t("profile.account.createdAt")}>
                    <span className="text-sm font-medium text-foreground">
                        {fmt.dateTime(profile?.createdAt)}
                    </span>
                </Tile>
            </div>
        </RevealCard>
    );
}

/** A single frosted stat tile: icon + label on top, value below. */
function Tile({
    icon,
    label,
    children,
}: {
    icon: ReactNode;
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-white/70 bg-white/55 p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-[0_12px_26px_-14px_rgba(255,107,157,0.6)]">
            <div className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="text-primary">{icon}</span>
                {label}
            </div>
            <div>{children}</div>
        </div>
    );
}
