import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2, Mail, Pencil, Phone, UserCircle2, X } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "@/contexts/I18nContext";
import type { ProfileResponse } from "@/types/features/profile";

import { profileSchema, type ProfileFormValues } from "../schemas";

interface Props {
    profile: ProfileResponse | null;
    onSave: (values: ProfileFormValues) => Promise<boolean>;
}

export function PersonalInfoCard({ profile, onSave }: Props) {
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const { t } = useTranslation();

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: { firstName: "", lastName: "", phone: "", bio: "" },
    });

    useEffect(() => {
        form.reset({
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            phone: profile?.phone ?? "",
            bio: profile?.bio ?? "",
        });
    }, [profile, form]);

    const handleSubmit = async (values: ProfileFormValues) => {
        setSaving(true);
        const ok = await onSave(values);
        setSaving(false);
        if (ok) setEditing(false);
    };

    const handleCancel = () => {
        form.reset({
            firstName: profile?.firstName ?? "",
            lastName: profile?.lastName ?? "",
            phone: profile?.phone ?? "",
            bio: profile?.bio ?? "",
        });
        setEditing(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div>
                    <CardTitle className="text-base flex items-center gap-2">
                        <UserCircle2 size={16} className="text-primary" />
                        {t("profile.personal.title")}
                    </CardTitle>
                    <CardDescription>{t("profile.personal.description")}</CardDescription>
                </div>
                {!editing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditing(true)}
                        className="gap-1.5"
                    >
                        <Pencil size={14} />
                        {t("profile.personal.edit")}
                    </Button>
                )}
            </CardHeader>

            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("profile.personal.firstName")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                readOnly={!editing}
                                                className={!editing ? "bg-muted cursor-default" : ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("profile.personal.lastName")}</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                readOnly={!editing}
                                                className={!editing ? "bg-muted cursor-default" : ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("auth.login.email")}</Label>
                                <div className="relative">
                                    <Mail
                                        size={15}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    />
                                    <Input
                                        value={profile?.email ?? ""}
                                        readOnly
                                        className="pl-9 bg-muted cursor-default"
                                    />
                                </div>
                            </div>

                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t("profile.personal.phone")}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Phone
                                                    size={15}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                                />
                                                <Input
                                                    {...field}
                                                    placeholder={t("profile.personal.phonePlaceholder")}
                                                    readOnly={!editing}
                                                    className={`pl-9 ${!editing ? "bg-muted cursor-default" : ""}`}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t("profile.personal.bio")}</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder={t("profile.personal.bioPlaceholder")}
                                            readOnly={!editing}
                                            rows={4}
                                            className={`resize-none ${!editing ? "bg-muted cursor-default" : ""}`}
                                        />
                                    </FormControl>
                                    <div className="flex justify-between">
                                        <FormMessage />
                                        {editing && (
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {(field.value ?? "").length}/500
                                            </span>
                                        )}
                                    </div>
                                </FormItem>
                            )}
                        />

                        {editing && (
                            <div className="flex gap-2 pt-1">
                                <Button type="submit" disabled={saving} className="gap-1.5">
                                    {saving ? (
                                        <Loader2 size={14} className="animate-spin" />
                                    ) : (
                                        <Check size={14} />
                                    )}
                                    {t("profile.personal.save")}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="gap-1.5"
                                >
                                    <X size={14} />
                                    {t("common.cancel")}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
