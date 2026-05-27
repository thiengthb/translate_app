import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { authApi } from "@/api/features/auth.api";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { ForgotEmailForm } from "@/components/auth/ForgotEmailForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import type { ForgotPasswordEmailRequest, ResetPasswordData } from "@/types/features/auth";

export default function ForgotPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);

    const onForgotPasswordSubmit = async (data: ForgotPasswordEmailRequest) => {
        setLoading(true);
        try {
            await authApi.forgotPassword(data);
            setEmailSent(true);
            toast.success("If an account exists, a reset link has been sent.");
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Could not send reset email");
        } finally {
            setLoading(false);
        }
    };

    const onResetPasswordSubmit = async (data: ResetPasswordData) => {
        if (!token) {
            toast.error("Invalid password reset link.");
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword({
                token,
                newPassword: data.password,
            });
            toast.success("Password reset successful! Please log in.");
            navigate("/login", { replace: true });
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Password reset failed");
        } finally {
            setLoading(false);
        }
    };

    const isResetMode = !!token;

    return (
        <GuestLayout>
        <div className="flex-1 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="max-w-md w-full border rounded-xl shadow-lg p-8 bg-card text-card-foreground"
            >
                <div className="space-y-2 text-center mb-8">
                    <h2 className="text-3xl font-bold tracking-tight">
                        {isResetMode ? "Set a new password" : "Forgot your password?"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {isResetMode
                            ? "Enter and confirm your new password."
                            : "Enter your email and we'll send a reset link."}
                    </p>
                </div>

                {isResetMode ? (
                    <ResetPasswordForm onSubmit={onResetPasswordSubmit} loading={loading} />
                ) : emailSent ? (
                    <div className="text-center text-sm text-muted-foreground space-y-2">
                        <p>Check your inbox for the reset link.</p>
                        <p className="text-xs">The link will expire in 15 minutes.</p>
                    </div>
                ) : (
                    <ForgotEmailForm onSubmit={onForgotPasswordSubmit} loading={loading} />
                )}

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Remembered your password?{" "}
                        <Link to="/login" className="font-semibold text-primary hover:underline">
                            Log in
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
        </GuestLayout>
    );
}
