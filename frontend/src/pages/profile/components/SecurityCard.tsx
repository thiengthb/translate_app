import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Lock, LogOut } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

import { passwordSchema, type PasswordFormValues } from "../schemas";
import { PasswordField } from "./PasswordField";
import { authApi } from "@/api/features/auth.api";
import { useTranslation } from "@/contexts/I18nContext";
import { useLogout } from "@/hooks/useLogout";

interface Props {
    onChangePassword: (values: PasswordFormValues) => Promise<boolean>;
}

export function SecurityCard({ onChangePassword }: Props) {
    const [saving, setSaving] = useState(false);
    const [signingOutEverywhere, setSigningOutEverywhere] = useState(false);
    const { t } = useTranslation();
    const logout = useLogout();

    const form = useForm<PasswordFormValues>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
    });

    const handleSubmit = async (values: PasswordFormValues) => {
        setSaving(true);
        const ok = await onChangePassword(values);
        setSaving(false);
        if (ok) form.reset();
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
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    {t("profile.security.title")}
                </CardTitle>
                <CardDescription>{t("profile.security.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.security.currentPassword")}</FormLabel>
                                    <FormControl>
                                        <PasswordField field={field} placeholder="••••••••" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="newPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("profile.security.newPassword")}</FormLabel>
                                        <FormControl>
                                            <PasswordField
                                                field={field}
                                                placeholder={t("profile.security.newPasswordPlaceholder")}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("profile.security.confirmPassword")}</FormLabel>
                                        <FormControl>
                                            <PasswordField
                                                field={field}
                                                placeholder={t("profile.security.confirmPlaceholder")}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <Button type="submit" disabled={saving} className="gap-1.5">
                            {saving ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <Lock size={14} />
                            )}
                            {t("profile.security.changePassword")}
                        </Button>
                    </form>
                </Form>

                <Separator />

                <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("profile.security.dangerZone")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                        {t("profile.security.logoutAllDescription")}
                    </p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={signingOutEverywhere}
                        onClick={handleLogoutEverywhere}
                        className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        {signingOutEverywhere ? (
                            <Loader2 size={14} className="animate-spin" />
                        ) : (
                            <LogOut size={14} />
                        )}
                        {t("profile.security.logoutAll")}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
