import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { authApi } from "@/api/features/auth.api";
import { Button } from "@/components/ui/button";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useTranslation } from "@/contexts/I18nContext";
import type { RegisterRequest } from "@/types/features/auth";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

export default function RegisterPage() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { t } = useTranslation();

    const onRegister = async (data: RegisterRequest) => {
        setLoading(true);
        setError("");
        try {
            await authApi.register(data);
            toast.success(t("auth.register.success"));
            navigate("/check-email", { replace: true, state: { email: data.email } });
        } catch (err: any) {
            const backendMsg = err?.response?.data?.message;
            setError(backendMsg || t("auth.register.failed"));
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = () => {
        setLoading(true);
        setError("");
        window.location.href = URL_LOGIN_WITH_GOOGLE;
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
                <div className="space-y-2 text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">{t("auth.register.title")}</h2>
                    <p className="text-sm text-muted-foreground">{t("auth.register.subtitle")}</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-md">
                        {error}
                    </div>
                )}

                <RegisterForm onSubmit={onRegister} loading={loading} />

                <Button
                    disabled={loading}
                    onClick={handleGoogleSignup}
                    variant="outline"
                    className="w-full mt-3"
                >
                    <FcGoogle className="mr-2 h-4 w-4" /> {t("auth.login.continueGoogle")}
                </Button>

                <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t("auth.register.alreadyHaveAccount")}{" "}
                        <Link
                            to="/login"
                            className="font-semibold text-primary hover:underline"
                        >
                            {t("auth.register.logIn")}
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
        </GuestLayout>
    );
}
