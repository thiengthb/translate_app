import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { useTranslation } from "@/contexts/I18nContext";
import { authApi } from "@/api/features/auth.api";

const RESEND_COOLDOWN_SECONDS = 60;

export default function CheckYourEmailPage() {
    const location = useLocation();
    const email = (location.state as { email?: string } | null)?.email ?? "";

    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => window.clearInterval(id);
    }, [cooldown]);

    if (!email) {
        return <Navigate to="/login" replace />;
    }

    const handleResend = async () => {
        setResending(true);
        try {
            await authApi.resendVerification(email);
            toast.success(t("auth.checkEmail.resendSuccess"));
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || t("auth.checkEmail.resendFailed"));
        } finally {
            setResending(false);
        }
    };

    return (
        <GuestLayout>
        <div className="flex-1 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="max-w-md w-full border rounded-xl shadow-lg p-8 bg-card text-card-foreground"
            >
                <div className="flex flex-col items-center text-center space-y-4 mb-6">
                    <div className="bg-primary/10 text-primary p-4 rounded-full">
                        <Mail size={36} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">{t("auth.checkEmail.title")}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t("auth.checkEmail.sentTo")} <br />
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <p className="text-sm text-muted-foreground text-center mb-6">
                    {t("auth.checkEmail.instructions")}
                </p>

                <Button
                    type="button"
                    className="w-full"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                >
                    {resending
                        ? t("auth.checkEmail.resending")
                        : cooldown > 0
                            ? t("auth.checkEmail.resendCooldown", { seconds: cooldown })
                            : t("auth.checkEmail.resend")}
                </Button>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    {t("auth.checkEmail.alreadyVerified")}{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                        {t("auth.register.logIn")}
                    </Link>
                </div>
            </motion.div>
        </div>
        </GuestLayout>
    );
}
