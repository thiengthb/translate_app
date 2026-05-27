import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Lock } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

interface Props {
    onChangePassword: (values: PasswordFormValues) => Promise<boolean>;
}

export function SecurityCard({ onChangePassword }: Props) {
    const [saving, setSaving] = useState(false);

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

    return (
        <Card>
            <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound size={16} className="text-primary" />
                    Bảo mật
                </CardTitle>
                <CardDescription>
                    Đổi mật khẩu để bảo vệ tài khoản (tối thiểu 8 ký tự)
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mật khẩu hiện tại</FormLabel>
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
                                        <FormLabel>Mật khẩu mới</FormLabel>
                                        <FormControl>
                                            <PasswordField
                                                field={field}
                                                placeholder="Tối thiểu 8 ký tự"
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
                                        <FormLabel>Xác nhận</FormLabel>
                                        <FormControl>
                                            <PasswordField field={field} placeholder="Nhập lại" />
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
                            Đổi mật khẩu
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
