import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { Input } from "@/components/ui/input";
import { authApi } from "@/api/features/auth.api";
import { setLogin } from "@/store/slices/auth/authSlice";
import { useTranslation } from "@/contexts/I18nContext";
import { getHomePathByRole } from "@/utils/rbac.utils";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

interface LoginFormProps {
    /** Called after a successful login (e.g. to close the host modal). */
    onSuccess?: () => void;
    /** Navigate-away hooks so the host can close itself first. */
    onForgotPassword?: () => void;
    /** Optional pre-filled error (e.g. OAuth redirect failure). */
    initialError?: string;
}

/**
 * Self-contained login form (email/password + TOTP 2FA challenge + Google),
 * styled for the liquid-glass auth modal. All presentation comes from
 * `auth-modal.css` via the `.auth-glass-form` wrapper provided by the host.
 */
export function LoginForm({ onSuccess, onForgotPassword, initialError }: LoginFormProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(initialError ?? "");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 2FA challenge state — set by step-1 response when the user has TOTP on.
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [totpError, setTotpError] = useState("");

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const finishLogin = (res: any) => {
        dispatch(setLogin(res));
        onSuccess?.();
        navigate(getHomePathByRole(res.role), { replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            const res = await authApi.login({ email: email.trim(), password: password.trim() });
            if (res.requiresTotp && res.tempToken) {
                setTempToken(res.tempToken);
                setTotpCode("");
                setTotpError("");
                return;
            }
            finishLogin(res);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || t("auth.login.invalidCredentials"));
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError(t("auth.login.unexpectedError"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleTotpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tempToken) return;
        setIsLoading(true);
        setTotpError("");
        try {
            const res = await authApi.completeTwoFactor({ tempToken, code: totpCode.trim() });
            finishLogin(res);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setTotpError(err.response?.data?.message || t("auth.totp.failed"));
            } else {
                setTotpError(t("auth.totp.failed"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLogin = () => {
        setIsLoading(true);
        setError("");
        window.location.href = URL_LOGIN_WITH_GOOGLE;
    };

    const Spinner = () => <Loader2 className="animate-spin" size={16} />;

    // ─── 2FA challenge view ────────────────────────────────────────────────
    if (tempToken) {
        return (
            <div className="space-y-5">
                <div className="text-center space-y-1.5">
                    <h2 className="text-2xl font-bold tracking-tight">{t("auth.totp.title")}</h2>
                    <p className="text-sm text-white/70">{t("auth.totp.subtitle")}</p>
                </div>

                {totpError && <div className="auth-glass-error">{totpError}</div>}

                <form onSubmit={handleTotpSubmit} className="auth-glass-form space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="totp-login-code" className="text-sm font-medium leading-none">
                            {t("auth.totp.codeLabel")}
                        </label>
                        <Input
                            id="totp-login-code"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                            autoFocus
                            autoComplete="one-time-code"
                            placeholder={t("auth.totp.codePlaceholder")}
                            className="text-center text-lg tracking-[6px] font-mono"
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-glass-btn-primary inline-flex items-center justify-center gap-2"
                        disabled={isLoading || totpCode.trim().length === 0}
                    >
                        {isLoading && <Spinner />}
                        {isLoading ? t("common.processing") : t("auth.totp.submit")}
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            setTempToken(null);
                            setTotpCode("");
                            setTotpError("");
                            setError("");
                        }}
                        disabled={isLoading}
                        className="w-full text-sm auth-glass-link"
                    >
                        ← {t("auth.totp.back")}
                    </button>
                </form>
            </div>
        );
    }

    // ─── Normal email/password view ────────────────────────────────────────
    return (
        <div className="space-y-4">
            {error && <div className="auth-glass-error">{error}</div>}

            <form onSubmit={handleSubmit} className="auth-glass-form space-y-4">
                <div className="space-y-2">
                    <label htmlFor="login-email" className="text-sm font-medium leading-none">
                        {t("auth.login.email")}
                    </label>
                    <Input
                        type="email"
                        id="login-email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder={t("auth.login.emailPlaceholder")}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label htmlFor="login-password" className="text-sm font-medium leading-none">
                            {t("auth.login.password")}
                        </label>
                        <button
                            type="button"
                            onClick={() => onForgotPassword?.()}
                            className="text-xs auth-glass-link"
                        >
                            {t("auth.login.forgotPassword")}
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            type={showPassword ? "text" : "password"}
                            id="login-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder={t("auth.login.passwordPlaceholder")}
                            className="pr-11"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-0 flex items-center px-3"
                            aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    className="auth-glass-btn-primary inline-flex items-center justify-center gap-2"
                    disabled={isLoading}
                >
                    {isLoading && <Spinner />}
                    {isLoading ? t("common.processing") : t("auth.login.submit")}
                </button>
            </form>

            <div className="auth-glass-divider">{t("auth.login.continueGoogle")}</div>

            <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="auth-glass-btn-ghost inline-flex items-center justify-center gap-2"
            >
                <FcGoogle className="h-4 w-4" /> Google
            </button>
        </div>
    );
}
