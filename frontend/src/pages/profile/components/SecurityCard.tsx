import { useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, KeyRound, Loader2, Lock, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import { authApi } from "@/api/features/auth.api";
import { useTranslation } from "@/contexts/I18nContext";
import { useLogout } from "@/hooks/useLogout";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";

import { passwordSchema, type PasswordFormValues } from "../schemas";
import { CardHeading, RevealCard } from "./profile-ui";
import { FloatingInput } from "./FloatingInput";
import { RippleButton } from "./RippleButton";

interface Props {
    onChangePassword: (values: PasswordFormValues) => Promise<boolean>;
    index?: number;
}

export function SecurityCard({ onChangePassword, index = 0 }: Props) {
    const [saving, setSaving] = useState(false);
    const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
    const { t } = useTranslation();
    const reduce = usePrefersReducedMotion();
    const logout = useLogout();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const submit = async (values: PasswordFormValues) => {
        setSaving(true);
        const ok = await onChangePassword(values);
        setSaving(false);
        if (ok) reset();
    };

    const handleLogoutEverywhere = async () => {
        if (!window.confirm(t("profile.security.logoutAllConfirm"))) return;
        setSigningOutEverywhere(true);
        try {
            await authApi.logoutAllDevices();
            toast.success(t("profile.security.logoutAllSuccess"));
        } catch {
            // fall through — useLogout still clears local state below
        } finally {
            setSigningOutEverywhere(false);
            await logout();
        }
    };

    return (
        <RevealCard index={index} reduce={reduce} className="p-5 sm:p-6">
            <CardHeading
                icon={<KeyRound size={18} />}
                title={t("profile.security.title")}
                info={t("profile.security.description")}
            />

            <form onSubmit={handleSubmit(submit)} className="mt-5 space-y-4">
                <PasswordField
                    label={t("profile.security.currentPassword")}
                    error={errors.currentPassword?.message}
                    registration={register("currentPassword")}
                />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <PasswordField
                        label={t("profile.security.newPassword")}
                        error={errors.newPassword?.message}
                        registration={register("newPassword")}
                    />
                    <PasswordField
                        label={t("profile.security.confirmPassword")}
                        error={errors.confirmPassword?.message}
                        registration={register("confirmPassword")}
                    />
                </div>

                <RippleButton type="submit" disabled={saving}>
                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                    {t("profile.security.changePassword")}
                </RippleButton>
            </form>

            {/* ── Danger zone ─────────────────────────────────────────────── */}
            <div className="mt-6 rounded-2xl border border-destructive/25 bg-destructive/5 p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-destructive/80">
                    {t("profile.security.dangerZone")}
                </p>
                <p className="mt-1 mb-3 text-sm text-muted-foreground">
                    {t("profile.security.logoutAllDescription")}
                </p>
                <RippleButton
                    variant="danger"
                    disabled={signingOutEverywhere}
                    onClick={handleLogoutEverywhere}
                    className="h-9 text-xs"
                >
                    {signingOutEverywhere ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <LogOut size={14} />
                    )}
                    {t("profile.security.logoutAll")}
                </RippleButton>
            </div>
        </RevealCard>
    );
}

/** A floating-label password input with an animated show/hide eye toggle. */
function PasswordField({
    label,
    error,
    registration,
}: {
    label: string;
    error?: string;
    registration: UseFormRegisterReturn;
}) {
    const [show, setShow] = useState(false);
    return (
        <div>
            <FloatingInput
                label={label}
                type={show ? "text" : "password"}
                error={!!error}
                autoComplete="off"
                rightSlot={
                    <button
                        type="button"
                        onClick={() => setShow((v) => !v)}
                        aria-label={show ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                        className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-primary cursor-pointer"
                    >
                        <motion.span
                            key={show ? "off" : "on"}
                            initial={{ opacity: 0, rotate: -30, scale: 0.7 }}
                            animate={{ opacity: 1, rotate: 0, scale: 1 }}
                            transition={{ duration: 0.18 }}
                        >
                            {show ? <EyeOff size={16} /> : <Eye size={16} />}
                        </motion.span>
                    </button>
                }
                {...registration}
            />
            <AnimatePresence>
                {error && (
                    <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="mt-1.5 pl-1 text-xs font-medium text-destructive"
                    >
                        {error}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    );
}
