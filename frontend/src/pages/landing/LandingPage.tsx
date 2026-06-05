import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

import { GuestLayout } from "@/components/layout/GuestLayout";
import { useTranslation } from "@/contexts/I18nContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

export default function LandingPage() {
    const { t } = useTranslation();
    const { openLogin, openRegister } = useAuthModal();
    const [searchParams, setSearchParams] = useSearchParams();
    const [email, setEmail] = useState("");

    // Auto-open the auth modal when arriving via /login or /register (which now
    // redirect to `/?auth=...`), or from OAuth's `?error=` callback. Runs once.
    useEffect(() => {
        const auth = searchParams.get("auth");
        if (auth === "login") {
            openLogin({ error: searchParams.get("error") ?? undefined });
        } else if (auth === "register") {
            openRegister();
        }
        if (auth) {
            searchParams.delete("auth");
            searchParams.delete("error");
            setSearchParams(searchParams, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        openRegister({ email: email.trim() || undefined });
    };

    return (
        <GuestLayout>
            {/* ── Hero: Mt Fuji image as the section's own background ── */}
            <section className="relative flex-1 flex flex-col items-center justify-center text-center px-4 py-24 text-white overflow-hidden">
                {/* Background image + vignette (inside the section so it paints
                    above GuestLayout's opaque background). */}
                <video
                    aria-hidden
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster="/login-bg.jpeg"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                        backgroundColor: "#1e293b",
                        // Phóng to & neo gốc trên-trái để góc dưới-phải
                        // (chứa watermark Gemini) tràn ra ngoài khung.
                        transform: "scale(1.18)",
                        transformOrigin: "top left",
                    }}
                >
                    <source src="/login-bg.mp4" type="video/mp4" />
                </video>
                <div
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                        background:
                            "radial-gradient(130% 100% at 50% 32%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.35) 100%)",
                    }}
                />

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    className="relative z-10 max-w-3xl"
                >
                    <h1 className="text-4xl sm:text-6xl font-bold tracking-tight leading-[1.1] drop-shadow-[0_2px_12px_rgba(0,0,0,0.4)]">
                        {t("landing.heroTitleA")}{" "}
                        {t("landing.heroTitleB")}{" "}
                        <span className="bg-gradient-to-r from-sky-300 to-indigo-300 bg-clip-text text-transparent">
                            {t("landing.heroTitleHighlight")}
                        </span>
                    </h1>

                    <p className="mt-6 text-lg sm:text-xl text-white/85 max-w-2xl mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">
                        {t("landing.heroSubtitle")}
                    </p>

                    {/* Mercury-style email pill → opens the register modal */}
                    <form
                        onSubmit={onEmailSubmit}
                        className="mt-9 mx-auto flex w-full max-w-md items-center gap-2 rounded-full border border-white/20 bg-white/10 p-1.5 pl-5 backdrop-blur-xl shadow-2xl"
                    >
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t("auth.login.emailPlaceholder")}
                            className="flex-1 bg-transparent text-white placeholder:text-white/55 outline-none text-sm sm:text-base min-w-0"
                        />
                        <button
                            type="submit"
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition-colors"
                        >
                            {t("landing.ctaStart")}
                            <ArrowRight size={15} />
                        </button>
                    </form>

                    <p className="mt-4 text-sm text-white/70">
                        {t("auth.register.alreadyHaveAccount")}{" "}
                        <button
                            type="button"
                            onClick={() => openLogin()}
                            className="font-semibold text-sky-300 hover:text-sky-200 hover:underline"
                        >
                            {t("nav.login")}
                        </button>
                    </p>
                </motion.div>

                {/* ── Legal / brand band (Mercury-style frosted strip) ── */}
                <div className="absolute inset-x-0 bottom-5 z-10 px-4">
                    <div className="mx-auto max-w-4xl rounded-xl border border-white/10 bg-black/35 px-5 py-3 text-center text-xs text-white/75 backdrop-blur-md">
                        Gengo · {t("landing.heroBadge")}
                    </div>
                </div>
            </section>
        </GuestLayout>
    );
}
