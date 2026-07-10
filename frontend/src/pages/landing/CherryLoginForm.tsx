import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import axios from "axios";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { authApi } from "@/api/features/auth.api";
import { setLogin } from "@/store/slices/auth/authSlice";
import { useTranslation } from "@/contexts/I18nContext";
import { getHomePathByRole } from "@/utils/rbac.utils";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

/**
 * Inline login form for the cherry-blossom landing stage. Same auth flow as
 * the old glass-modal LoginForm (email/password + TOTP 2FA + Google) but
 * styled with the sakura `cherry-*` classes instead of `auth-glass-*`.
 */
export function CherryLoginForm({ initialError }: { initialError?: string }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(initialError ?? "");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // 2FA challenge state — set by step-1 response when the user has TOTP on.
    const [tempToken, setTempToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");

    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { t } = useTranslation();

    const finishLogin = (res: any) => {
        dispatch(setLogin(res));
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
        setError("");
        try {
            const res = await authApi.completeTwoFactor({ tempToken, code: totpCode.trim() });
            finishLogin(res);
        } catch (err) {
            if (axios.isAxiosError(err)) {
                setError(err.response?.data?.message || t("auth.totp.failed"));
            } else {
                setError(t("auth.totp.failed"));
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

    // ─── 2FA challenge view ────────────────────────────────────────────────
    if (tempToken) {
        return (
            <form onSubmit={handleTotpSubmit} className="cherry-form">
                <p className="cherry-sub">{t("auth.totp.subtitle")}</p>
                {error && <div className="cherry-error">{error}</div>}

                <div className="cherry-field">
                    <label htmlFor="cherry-totp">{t("auth.totp.codeLabel")}</label>
                    <input
                        id="cherry-totp"
                        className="cherry-input"
                        style={{ textAlign: "center", letterSpacing: "0.4em" }}
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        autoFocus
                        autoComplete="one-time-code"
                        placeholder={t("auth.totp.codePlaceholder")}
                    />
                </div>

                <button
                    type="submit"
                    className="cherry-btn"
                    disabled={isLoading || totpCode.trim().length === 0}
                >
                    {isLoading && <Loader2 className="animate-spin" size={16} />}
                    {isLoading ? t("common.processing") : t("auth.totp.submit")}
                </button>

                <button
                    type="button"
                    className="cherry-link"
                    disabled={isLoading}
                    onClick={() => {
                        setTempToken(null);
                        setTotpCode("");
                        setError("");
                    }}
                >
                    ← {t("auth.totp.back")}
                </button>
            </form>
        );
    }

    // ─── Normal email/password view ────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} className="cherry-form">
            {error && <div className="cherry-error">{error}</div>}

            <div className="cherry-field">
                <label htmlFor="cherry-email">{t("auth.login.email")}</label>
                <input
                    type="email"
                    id="cherry-email"
                    className="cherry-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder={t("auth.login.emailPlaceholder")}
                />
            </div>

            <div className="cherry-field">
                <div className="row">
                    <label htmlFor="cherry-password">{t("auth.login.password")}</label>
                    <button
                        type="button"
                        className="cherry-link"
                        onClick={() => navigate("/forgot-password")}
                    >
                        {t("auth.login.forgotPassword")}
                    </button>
                </div>
                <div className="cherry-input-wrap">
                    <input
                        type={showPassword ? "text" : "password"}
                        id="cherry-password"
                        className="cherry-input"
                        style={{ paddingRight: "3em" }}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder={t("auth.login.passwordPlaceholder")}
                    />
                    <button
                        type="button"
                        className="cherry-eye"
                        onClick={() => setShowPassword((v) => !v)}
                        aria-label={showPassword ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
            </div>

            <button type="submit" className="cherry-btn" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading ? t("common.processing") : t("auth.login.submit")}
            </button>

            <div className="cherry-divider">{t("auth.login.continueGoogle")}</div>

            <button
                type="button"
                className="cherry-google"
                onClick={handleGoogleLogin}
                disabled={isLoading}
            >
                <FcGoogle size={16} /> Google
            </button>
        </form>
    );
}
