import React, { useState } from "react";
import { Loader2 } from "lucide-react";

import { authApi } from "@/api/features/auth.api";
import { useTranslation } from "@/contexts/I18nContext";

/**
 * Inline "forgot password" step for the cherry-blossom landing stage. Same
 * request-a-reset-link flow as {@link ForgotPasswordPage}'s email step
 * (`authApi.forgotPassword`), but rendered right on the landing page behind the
 * mode switch so clicking "Quên mật khẩu?" never navigates away. The actual
 * reset-with-token screen (reached from the emailed link) still lives at
 * `/forgot-password?token=…`.
 */
export function CherryForgotForm({ onBack }: { onBack: () => void }) {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { t } = useTranslation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setIsLoading(true);
        try {
            await authApi.forgotPassword({ email: email.trim() });
            setSent(true);
        } catch (err: any) {
            setError(err?.response?.data?.message || t("auth.forgot.failed"));
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Success view ──────────────────────────────────────────────────────
    if (sent) {
        return (
            <div className="cherry-form">
                <div className="cherry-sub" style={{ marginTop: 0 }}>
                    <p style={{ margin: 0 }}>{t("auth.forgot.checkInbox")}</p>
                    <p style={{ margin: "0.4em 0 0", opacity: 0.8 }}>
                        {t("auth.forgot.linkExpires")}
                    </p>
                </div>
                <button type="button" className="cherry-btn" onClick={onBack}>
                    ← {t("auth.register.logIn")}
                </button>
            </div>
        );
    }

    // ─── Email request view ────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} className="cherry-form">
            {error && <div className="cherry-error">{error}</div>}

            <div className="cherry-field">
                <label htmlFor="cherry-forgot-email">{t("auth.login.email")}</label>
                <input
                    type="email"
                    id="cherry-forgot-email"
                    className="cherry-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    placeholder={t("auth.login.emailPlaceholder")}
                />
            </div>

            <button type="submit" className="cherry-btn" disabled={isLoading}>
                {isLoading && <Loader2 className="animate-spin" size={16} />}
                {isLoading ? t("common.sending") : t("auth.forgot.submit")}
            </button>
        </form>
    );
}
