import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useTranslation } from "@/contexts/I18nContext";
import type { ForgotPasswordEmailRequest } from "@/types";

const emailSchema = z.object({
    email: z.string().email("common.invalidEmail"),
});

interface ForgotEmailFormProps {
    onSubmit: (data: ForgotPasswordEmailRequest) => void;
    loading: boolean;
}

export const ForgotEmailForm = ({ onSubmit, loading }: ForgotEmailFormProps) => {
    const { t } = useTranslation();
    const form = useForm<ForgotPasswordEmailRequest>({
        resolver: zodResolver(emailSchema),
        defaultValues: { email: "" },
    });

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem className="space-y-2">
                            <FormLabel className="text-sm font-medium leading-none">{t("auth.login.email")}</FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    type="email"
                                    placeholder={t("auth.login.emailPlaceholder")}
                                    className="bg-background"
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" aria-hidden>
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
                            {t("common.sending")}
                        </span>
                    ) : (
                        t("auth.forgot.submit")
                    )}
                </Button>
            </form>
        </Form>
    );
};
