import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Mail, Pencil, Phone, UserCircle2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { useTranslation } from "@/contexts/I18nContext";
import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";
import type { ProfileResponse } from "@/types/features/profile";

import { profileSchema, type ProfileFormValues } from "../schemas";
import { CardHeading, RevealCard } from "./profile-ui";
import { FloatingInput, FloatingTextarea } from "./FloatingInput";
import { RippleButton } from "./RippleButton";

interface Props {
    profile: ProfileResponse | null;
    onSave: (values: ProfileFormValues) => Promise<boolean>;
    index?: number;
}

export function PersonalInfoCard({ profile, onSave, index = 0 }: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const { t } = useTranslation();
    const reduce = usePrefersReducedMotion();

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { firstName: "", lastName: "", phone: "", bio: "" },
    });

    const seed = () =>
        reset({
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            phone: profile?.phone ?? "",
            bio: profile?.bio ?? "",
        });

    useEffect(seed, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

    const submit = async (values: ProfileFormValues) => {
        setSaving(true);
        const ok = await onSave(values);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const cancel = () => {
        seed();
        setEditing(false);
    };

    const bioLen = (watch("bio") ?? "").length;

    return (
        <RevealCard index={index} reduce={reduce} className="flex flex-col p-5 sm:p-6">
            <CardHeading
                icon={<UserCircle2 size={18} />}
                title={t("profile.personal.title")}
                info={t("profile.personal.description")}
                action={
                    <AnimatePresence mode="wait" initial={false}>
                        {!editing && (
                            <motion.button
                                key="edit"
                                type="button"
                                onClick={() => setEditing(true)}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                whileTap={{ scale: 0.94 }}
                                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/50 hover:text-primary cursor-pointer"
                            >
                                <Pencil size={13} />
                                {t("profile.personal.edit")}
                            </motion.button>
                        )}
                    </AnimatePresence>
                }
            />

            <form onSubmit={handleSubmit(submit)} className="mt-5 flex flex-1 flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field error={errors.firstName?.message}>
                        <FloatingInput
                            label={t("profile.personal.firstName")}
                            readOnly={!editing}
                            error={!!errors.firstName}
                            {...register("firstName")}
                        />
                    </Field>
                    <Field error={errors.lastName?.message}>
                        <FloatingInput
                            label={t("profile.personal.lastName")}
                            readOnly={!editing}
                            error={!!errors.lastName}
                            {...register("lastName")}
                        />
                    </Field>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Email is always read-only — it's the login identity. */}
                    <FloatingInput
                        label={t("auth.login.email")}
                        icon={<Mail size={15} />}
                        value={profile?.email ?? ""}
                        readOnly
                        onChange={() => {}}
                    />
                    <Field error={errors.phone?.message}>
                        <FloatingInput
                            label={t("profile.personal.phone")}
                            icon={<Phone size={15} />}
                            readOnly={!editing}
                            error={!!errors.phone}
                            {...register("phone")}
                        />
                    </Field>
                </div>

                <Field error={errors.bio?.message}>
                    <FloatingTextarea
                        label={t("profile.personal.bio")}
                        readOnly={!editing}
                        error={!!errors.bio}
                        rows={4}
                        {...register("bio")}
                    />
                    {editing && (
                        <span className="mt-1 block text-right text-[11px] text-muted-foreground">
                            {bioLen}/500
                        </span>
                    )}
                </Field>

                <AnimatePresence initial={false}>
                    {editing && (
                        <motion.div
                            key="actions"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="flex gap-2.5 overflow-hidden pt-1"
                        >
                            <RippleButton type="submit" disabled={saving}>
                                {saving ? (
                                    <Loader2 size={15} className="animate-spin" />
                                ) : (
                                    <Check size={15} />
                                )}
                                {t("profile.personal.save")}
                            </RippleButton>
                            <RippleButton type="button" variant="outline" disabled={saving} onClick={cancel}>
                                <X size={15} />
                                {t("common.cancel")}
                            </RippleButton>
                        </motion.div>
                    )}
                </AnimatePresence>
            </form>
        </RevealCard>
    );
}

/** Wraps a field + its animated validation message. */
function Field({ error, children }: { error?: string; children: React.ReactNode }) {
    return (
        <div>
            {children}
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
