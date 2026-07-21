import { Loader2 } from "lucide-react";
import { motion } from "motion/react";

import { MainLayout } from "@/components/layout/MainLayout";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import { AccountInfoCard } from "./components/AccountInfoCard";
import { IdentityCard } from "./components/IdentityCard";
import { LanguageCard } from "./components/LanguageCard";
import { PersonalInfoCard } from "./components/PersonalInfoCard";
import { SecurityCard } from "./components/SecurityCard";
import { SessionsCard } from "./components/SessionsCard";
import { TwoFactorCard } from "./components/TwoFactorCard";
import { useProfile } from "./useProfile";

export default function ProfilePage() {
    const { profile, loading, setAvatarUrl, saveInfo, changePassword } = useProfile();
    const reduce = usePrefersReducedMotion();

    return (
        <MainLayout>
            {/* Ambient pastel-pink field: soft blurred sakura blobs drift behind
                the frosted cards, giving the flat white shell some depth. */}
            <div className="relative isolate w-full">
                <SakuraAmbience reduce={reduce} />

                {/* Cards reveal in a gentle stagger via each card's `index`. */}
                <div className="mx-auto w-full max-w-5xl space-y-5 py-1">
                    <IdentityCard profile={profile} onAvatarChange={setAvatarUrl} index={0} />

                    {loading ? (
                        <div className="flex h-56 items-center justify-center">
                            <Loader2 className="animate-spin text-primary" size={30} />
                        </div>
                    ) : (
                        <>
                            {/* Two-column masonry: the tall Personal form on the
                                left, Account + Security stacked on the right. */}
                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                <PersonalInfoCard profile={profile} onSave={saveInfo} index={1} />
                                <div className="space-y-5">
                                    <AccountInfoCard profile={profile} index={2} />
                                    <SecurityCard onChangePassword={changePassword} index={3} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                                <LanguageCard index={4} />
                                <TwoFactorCard index={5} />
                            </div>

                            <SessionsCard index={6} />
                        </>
                    )}
                </div>
            </div>
        </MainLayout>
    );
}

/** Decorative, non-interactive pastel blobs behind the profile cards. */
function SakuraAmbience({ reduce }: { reduce: boolean }) {
    const blobs = [
        { className: "left-[-6%] top-4 h-64 w-64 bg-[#ffd0de]", dur: 13 },
        { className: "right-[-8%] top-40 h-72 w-72 bg-[#ffe0ea]", dur: 16 },
        { className: "left-1/3 bottom-0 h-60 w-60 bg-[#ffdce7]", dur: 15 },
    ];
    return (
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {blobs.map((b, i) => (
                <motion.div
                    key={i}
                    className={`absolute rounded-full opacity-50 blur-3xl ${b.className}`}
                    animate={reduce ? undefined : { y: [0, 26, 0], x: [0, -18, 0] }}
                    transition={{ duration: b.dur, repeat: Infinity, ease: "easeInOut" }}
                />
            ))}
        </div>
    );
}
