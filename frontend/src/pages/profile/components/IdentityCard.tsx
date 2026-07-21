import { CalendarDays, Mail, Phone, Sparkles, Shield } from "lucide-react";
import { motion } from "motion/react";

import { useTranslation } from "@/contexts/I18nContext";
import { useFormat } from "@/i18n/format";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import { formatRoleLabel } from "@/utils/rbac.utils";
import type { ProfileResponse } from "@/types/features/profile";

import { AvatarUploader } from "./AvatarUploader";
import { MetaPill, RevealCard } from "./profile-ui";

interface Props {
    profile: ProfileResponse | null;
    onAvatarChange: (url: string) => void;
    index?: number;
}

/**
 * Profile hero. A pastel-pink gradient banner with drifting sakura petals sits
 * behind a tilting avatar, the user's name + role badges, and a responsive row
 * of frosted metadata pills (email / phone / joined).
 */
export function IdentityCard({ profile, onAvatarChange, index = 0 }: Props) {
    const { t } = useTranslation();
    const fmt = useFormat();
    const reduce = usePrefersReducedMotion();

    const fullName =
        [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "—";

    return (
        <RevealCard index={index} reduce={reduce} className="overflow-hidden">
            {/* ── Gradient banner ─────────────────────────────────────────── */}
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-[#ffd0de] via-primary/70 to-[#ff8fab] sm:h-36">
                {/* Drifting blurred petals for depth. */}
                {!reduce &&
                    [
                        { size: 90, top: "-20%", left: "8%", dur: 9 },
                        { size: 60, top: "35%", left: "78%", dur: 11 },
                        { size: 40, top: "10%", left: "45%", dur: 7 },
                    ].map((p, i) => (
                        <motion.span
                            key={i}
                            aria-hidden
                            className="absolute rounded-full bg-white/40 blur-xl"
                            style={{ width: p.size, height: p.size, top: p.top, left: p.left }}
                            animate={{ y: [0, 16, 0], x: [0, 10, 0], opacity: [0.5, 0.8, 0.5] }}
                            transition={{ duration: p.dur, repeat: Infinity, ease: "easeInOut" }}
                        />
                    ))}
                <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-white/30 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                    <Sparkles size={12} />
                    Hanabun
                </div>
            </div>

            {/* ── Identity ─────────────────────────────────────────────────
                Centered hero: the avatar overlaps the banner while the name and
                role badges sit clearly BELOW it on white — so the name always
                has strong contrast and never straddles the banner seam. */}
            <div className="px-5 pb-6 sm:px-8 sm:pb-7">
                <div className="flex flex-col items-center gap-3 text-center">
                    <div className="-mt-16 sm:-mt-[4.75rem]">
                        <AvatarUploader profile={profile} onAvatarChange={onAvatarChange} />
                    </div>

                    <div className="space-y-2.5">
                        <motion.h1
                            initial={reduce ? false : { opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.25, duration: 0.5 }}
                            className="font-display text-[26px] font-extrabold leading-tight tracking-tight text-foreground sm:text-[32px]"
                        >
                            {fullName}
                        </motion.h1>
                        <div className="flex flex-wrap justify-center gap-1.5">
                            {(profile?.roles ?? []).map((r) => (
                                <span
                                    key={r}
                                    className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-primary"
                                >
                                    <Shield size={11} />
                                    {formatRoleLabel(r)}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Metadata pills ──────────────────────────────────────── */}
                <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <MetaPill
                        icon={<Mail size={15} />}
                        label={t("profile.identity.email")}
                        value={profile?.email || "—"}
                    />
                    <MetaPill
                        icon={<Phone size={15} />}
                        label={t("profile.identity.phone")}
                        value={profile?.phone || t("profile.identity.phoneEmpty")}
                        muted={!profile?.phone}
                    />
                    <MetaPill
                        icon={<CalendarDays size={15} />}
                        label={t("profile.identity.joined")}
                        value={fmt.date(profile?.createdAt)}
                    />
                </div>

                {profile?.bio && (
                    <div className="mt-4 rounded-2xl border border-white/70 bg-white/50 px-4 py-3">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("profile.identity.bio")}
                        </p>
                        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                            {profile.bio}
                        </p>
                    </div>
                )}
            </div>
        </RevealCard>
    );
}
