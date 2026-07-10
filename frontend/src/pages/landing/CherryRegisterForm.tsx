import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { FcGoogle } from "react-icons/fc";

import { authApi } from "@/api/features/auth.api";
import { useTranslation } from "@/contexts/I18nContext";
import type { RegisterRequest } from "@/types/features/auth";

const URL_LOGIN_WITH_GOOGLE =
    import.meta.env.VITE_API_URL_FOR_GOOGLE || "http://localhost:8080/oauth2/authorization/google";

const registerSchema = z
    .object({
        firstName: z.string().min(1, "common.required"),
        lastName: z.string().min(1, "common.required"),
        email: z.string().email("common.invalidEmail"),
        password: z.string().min(8, "common.passwordTooShort"),
        confirmPassword: z.string().min(8, "common.passwordTooShort"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "common.passwordsNoMatch",
        path: ["confirmPassword"],
    });

/**
 * Inline register form for the cherry-blossom landing stage. Same flow as the
 * old glass-modal RegisterPanel (validation + register + Google) but styled
 * with the sakura `cherry-*` classes so it lives on the page itself instead of
 * in a popup.
 */
export function CherryRegisterForm({ defaultEmail }: { defaultEmail?: string }) {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<RegisterRequest>({
        resolver: zodResolver(registerSchema),
        mode: "onChange",
        defaultValues: { firstName: "", lastName: "", email: defaultEmail ?? "", password: "", confirmPassword: "" },
    });

    const onSubmit = async (data: RegisterRequest) => {
        setLoading(true);
        setError("");
        try {
            await authApi.register(data);
            toast.success(t("auth.register.success"));
            navigate("/check-email", { replace: true, state: { email: data.email } });
        } catch (err: any) {
            setError(err?.response?.data?.message || t("auth.register.failed"));
        } finally {
            setLoading(false);
        }
    };

    // zod messages are i18n keys stored as plain strings; translate loosely.
    const err = (key?: string) => (key ? (t as (k: string) => string)(key) : undefined);

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="cherry-form">
            {error && <div className="cherry-error">{error}</div>}

            <div className="cherry-field-row">
                <div className="cherry-field">
                    <label htmlFor="cherry-firstName">{t("auth.register.firstName")}</label>
                    <input
                        id="cherry-firstName"
                        className="cherry-input"
                        placeholder={t("auth.register.firstNamePlaceholder")}
                        {...register("firstName")}
                    />
                    {errors.firstName && <span className="cherry-field-err">{err(errors.firstName.message)}</span>}
                </div>
                <div className="cherry-field">
                    <label htmlFor="cherry-lastName">{t("auth.register.lastName")}</label>
                    <input
                        id="cherry-lastName"
                        className="cherry-input"
                        placeholder={t("auth.register.lastNamePlaceholder")}
                        {...register("lastName")}
                    />
                    {errors.lastName && <span className="cherry-field-err">{err(errors.lastName.message)}</span>}
                </div>
            </div>

            <div className="cherry-field">
                <label htmlFor="cherry-reg-email">{t("auth.register.email")}</label>
                <input
                    id="cherry-reg-email"
                    type="email"
                    className="cherry-input"
                    placeholder={t("auth.login.emailPlaceholder")}
                    {...register("email")}
                />
                {errors.email && <span className="cherry-field-err">{err(errors.email.message)}</span>}
            </div>

            <div className="cherry-field">
                <label htmlFor="cherry-reg-password">{t("auth.register.password")}</label>
                <div className="cherry-input-wrap">
                    <input
                        id="cherry-reg-password"
                        type={showPassword ? "text" : "password"}
                        className="cherry-input"
                        style={{ paddingRight: "3em" }}
                        placeholder="••••••••"
                        {...register("password")}
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
                {errors.password && <span className="cherry-field-err">{err(errors.password.message)}</span>}
            </div>

            <div className="cherry-field">
                <label htmlFor="cherry-reg-confirm">{t("auth.register.confirmPassword")}</label>
                <div className="cherry-input-wrap">
                    <input
                        id="cherry-reg-confirm"
                        type={showConfirm ? "text" : "password"}
                        className="cherry-input"
                        style={{ paddingRight: "3em" }}
                        placeholder="••••••••"
                        {...register("confirmPassword")}
                    />
                    <button
                        type="button"
                        className="cherry-eye"
                        onClick={() => setShowConfirm((v) => !v)}
                        aria-label={showConfirm ? t("auth.login.hidePassword") : t("auth.login.showPassword")}
                    >
                        {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                </div>
                {errors.confirmPassword && (
                    <span className="cherry-field-err">{err(errors.confirmPassword.message)}</span>
                )}
            </div>

            <button type="submit" className="cherry-btn" disabled={loading}>
                {loading && <Loader2 className="animate-spin" size={16} />}
                {loading ? t("common.processing") : t("auth.register.submit")}
            </button>

            <div className="cherry-divider">{t("auth.login.continueGoogle")}</div>

            <button
                type="button"
                className="cherry-google"
                onClick={() => {
                    setLoading(true);
                    window.location.href = URL_LOGIN_WITH_GOOGLE;
                }}
                disabled={loading}
            >
                <FcGoogle size={16} /> Google
            </button>
        </form>
    );
}
