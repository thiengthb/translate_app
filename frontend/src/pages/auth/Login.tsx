import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "motion/react";
import { FcGoogle } from "react-icons/fc";
import { useDispatch } from "react-redux";
import { setLogin } from "@/store/slices/auth/authSlice";
import { authApi } from "@/api/features/auth.api";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { DevQuickLogin, type DevAccount } from "@/components/auth/DevQuickLogin";
import { useTranslation } from "@/contexts/I18nContext";
import type { MessageKey } from "@/i18n";
import axios from "axios";
import { Eye, EyeOff } from "lucide-react";
import { getHomePathByRole } from "@/utils/rbac.utils";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

const OAUTH_ERROR_KEYS: Record<string, MessageKey> = {
    google_auth_failed: "auth.login.googleFailed",
    google_token_missing: "auth.login.googleTokenMissing",
    google_token_invalid: "auth.login.googleTokenInvalid",
    "true": "auth.login.signInGeneric",
};

export const Login: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 2FA challenge state — set by step-1 response when the user has TOTP on.
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [totpError, setTotpError] = useState("");

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    useEffect(() => {
        const param = searchParams.get("error");
        const key = param ? OAUTH_ERROR_KEYS[param] : undefined;
        if (key) setError(t(key));
    }, [searchParams, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();
        try {
            const res = await authApi.login({ email: cleanEmail, password: cleanPassword });
            if (res.requiresTotp && res.tempToken) {
                // Switch UI into 2FA challenge mode; don't dispatch setLogin yet.
                setTempToken(res.tempToken);
                setTotpCode("");
                setTotpError("");
                return;
            }
            dispatch(setLogin(res));
            navigate(getHomePathByRole(res.role), { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const backendMsg = err.response?.data?.message;
                setError(backendMsg || t("auth.login.invalidCredentials"));
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
            const res = await authApi.completeTwoFactor({
                tempToken,
                code: totpCode.trim(),
            });
            dispatch(setLogin(res));
            navigate(getHomePathByRole(res.role), { replace: true });
        } catch (err) {
            if (axios.isAxiosError(err)) {
                const backendMsg = err.response?.data?.message;
                setTotpError(backendMsg || t("auth.totp.failed"));
            } else {
                setTotpError(t("auth.totp.failed"));
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        setTempToken(null);
        setTotpCode("");
        setTotpError("");
        setError("");
    };

    const handleGoogleLogin = () => {
        setIsLoading(true);
        setError("");
        window.location.href = URL_LOGIN_WITH_GOOGLE;
    };

    // ─── Dev-only quick login ───────────────────────────────────────────────
    // Generic handler: same API contract as a real form submit so 2FA / TOTP
    // gating still works (if a seed account somehow has 2FA on, the user
    // bumps into the TOTP screen as expected).
    const loginAsDevAccount = useCallback(
        async (account: DevAccount) => {
            if (!import.meta.env.DEV) return; // belt-and-braces — also gated by render
            setError("");
            setIsLoading(true);
            try {
                const res = await authApi.login({
                    email: account.email,
                    password: account.password,
                });
                if (res.requiresTotp && res.tempToken) {
                    setTempToken(res.tempToken);
                    setTotpCode("");
                    setTotpError("");
                    return;
                }
                dispatch(setLogin(res));
                navigate(getHomePathByRole(res.role), { replace: true });
            } catch (err) {
                if (axios.isAxiosError(err)) {
                    const backendMsg = err.response?.data?.message;
                    setError(backendMsg || t("auth.login.invalidCredentials"));
                } else if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError(t("auth.login.unexpectedError"));
                }
            } finally {
                setIsLoading(false);
            }
        },
        [dispatch, navigate, t],
    );

    return (
        <GuestLayout>
        <div className="flex-1 flex items-center justify-center px-4 py-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="max-w-md w-full border rounded-2xl shadow-lg p-6 sm:p-8 bg-card text-card-foreground"
            >
                {tempToken ? (
                    <>
                        <div className="space-y-2 text-center mb-6">
                            <h2 className="text-3xl font-bold tracking-tight">
                                {t("auth.totp.title")}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                {t("auth.totp.subtitle")}
                            </p>
                        </div>

                        {totpError && (
                            <div className="mb-6 p-3 bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-md">
                                {totpError}
                            </div>
                        )}

                        <form onSubmit={handleTotpSubmit} className="space-y-4">
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
                                    className="bg-background text-center text-lg tracking-[4px] font-mono"
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={isLoading || totpCode.trim().length === 0}>
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        {t("common.processing")}
                                    </span>
                                ) : (
                                    t("auth.totp.submit")
                                )}
                            </Button>

                            <button
                                type="button"
                                onClick={handleBackToLogin}
                                disabled={isLoading}
                                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                ← {t("auth.totp.back")}
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                <div className="space-y-2 text-center mb-6">
                    <h2 className="text-3xl font-bold tracking-tight">{t("auth.login.title")}</h2>
                </div>

                {error && (
                    <div className="mb-6 p-3 bg-destructive/15 border border-destructive/30 text-destructive text-sm rounded-md">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium leading-none">
                            {t("auth.login.email")}
                        </label>
                        <Input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder={t("auth.login.emailPlaceholder")}
                            className="bg-background"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label htmlFor="password" className="text-sm font-medium leading-none">
                                {t("auth.login.password")}
                            </label>
                            <Link
                                to="/forgot-password"
                                className="text-xs text-muted-foreground hover:text-primary hover:underline"
                            >
                                {t("auth.login.forgotPassword")}
                            </Link>
                        </div>
                        <div className="relative">
                            <Input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder={t("auth.login.passwordPlaceholder")}
                                className="bg-background pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                                aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <span className="flex items-center gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        fill="none"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                                {t("common.processing")}
                            </span>
                        ) : (
                            t("auth.login.submit")
                        )}
                    </Button>
                </form>

                <Button
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                    variant="outline"
                    className="w-full mt-3"
                >
                    <FcGoogle className="mr-2 h-4 w-4" /> {t("auth.login.continueGoogle")}
                </Button>

                <div className="mt-4 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t("auth.login.noAccount")}{" "}
                        <Link
                            to="/register"
                            className="font-semibold text-primary hover:underline"
                        >
                            {t("auth.login.registerNow")}
                        </Link>
                    </p>
                </div>
                    </>
                )}
            </motion.div>
        </div>

        {/* Dev-only floating quick-login (bottom-right). */}
        <DevQuickLogin onSelect={loginAsDevAccount} disabled={isLoading} />
        </GuestLayout>
    );
};
