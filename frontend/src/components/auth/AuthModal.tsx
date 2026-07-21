import { useState } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { authApi } from "@/api/features/auth.api";
import { useTranslation } from "@/contexts/I18nContext";
import type { RegisterRequest } from "@/types/features/auth";

import "./auth-modal.css";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

export type AuthMode = "login" | "register";

interface AuthModalProps {
    open: boolean;
    mode: AuthMode;
    initialError?: string;
    defaultEmail?: string;
    onModeChange: (mode: AuthMode) => void;
    onClose: () => void;
}

/** Register panel — wraps the shared RegisterForm with submit + Google. */
function RegisterPanel({ onClose, defaultEmail }: { onClose: () => void; defaultEmail?: string }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const onRegister = async (data: RegisterRequest) => {
        setLoading(true);
        setError("");
        try {
            await authApi.register(data);
            toast.success(t("auth.register.success"));
            onClose();
            navigate("/check-email", { replace: true, state: { email: data.email } });
        } catch (err: any) {
            setError(err?.response?.data?.message || t("auth.register.failed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {error && <div className="auth-glass-error">{error}</div>}

            <div className="auth-glass-form">
                <RegisterForm onSubmit={onRegister} loading={loading} defaultEmail={defaultEmail} />
            </div>

            <div className="auth-glass-divider">{t("auth.login.continueGoogle")}</div>

            <button
                type="button"
                onClick={() => {
                    setLoading(true);
                    window.location.href = URL_LOGIN_WITH_GOOGLE;
                }}
                disabled={loading}
                className="auth-glass-btn-ghost inline-flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <FcGoogle className="h-4 w-4" />} Google
            </button>
        </div>
    );
}

/**
 * Liquid-glass auth modal. Hosts the login & register forms behind a segmented
 * tab switch. Styling lives in `auth-modal.css`. Rendered globally by
 * AuthModalProvider; opened from the guest header / landing CTAs.
 */
export function AuthModal({ open, mode, initialError, defaultEmail, onModeChange, onClose }: AuthModalProps) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="auth-glass-overlay" />
                <DialogPrimitive.Content className="auth-glass-panel" aria-describedby={undefined}>
                    <DialogPrimitive.Title className="sr-only">
                        {mode === "login" ? t("auth.login.title") : t("auth.register.title")}
                    </DialogPrimitive.Title>

                    {/* Close */}
                    <DialogPrimitive.Close
                        className="absolute right-4 top-4 text-white/70 hover:text-white transition-colors"
                        aria-label="Đóng"
                    >
                        <X size={18} />
                    </DialogPrimitive.Close>

                    {/* Brand / heading */}
                    <div className="text-center mb-5 mt-1">
                        <h2 className="text-2xl font-bold tracking-tight drop-shadow-sm">
                            {mode === "login" ? t("auth.login.title") : t("auth.register.title")}
                        </h2>
                    </div>

                    {/* Segmented tabs */}
                    <div className="auth-glass-tabs mb-5">
                        <button
                            type="button"
                            className="auth-glass-tab"
                            data-active={mode === "login"}
                            onClick={() => onModeChange("login")}
                        >
                            {t("nav.login")}
                        </button>
                        <button
                            type="button"
                            className="auth-glass-tab"
                            data-active={mode === "register"}
                            onClick={() => onModeChange("register")}
                        >
                            {t("nav.register")}
                        </button>
                    </div>

                    {mode === "login" ? (
                        <LoginForm
                            initialError={initialError}
                            onSuccess={onClose}
                            onForgotPassword={() => {
                                onClose();
                                navigate("/forgot-password");
                            }}
                        />
                    ) : (
                        <RegisterPanel onClose={onClose} defaultEmail={defaultEmail} />
                    )}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
