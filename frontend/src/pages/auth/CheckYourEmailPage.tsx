import { useEffect, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GuestLayout } from "@/components/layout/GuestLayout";
import { authApi } from "@/api/features/auth.api";

const RESEND_COOLDOWN_SECONDS = 60;

export default function CheckYourEmailPage() {
    const location = useLocation();
    const email = (location.state as { email?: string } | null)?.email ?? "";

    const [cooldown, setCooldown] = useState(0);
    const [resending, setResending] = useState(false);

    useEffect(() => {
        if (cooldown <= 0) return;
        const id = window.setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => window.clearInterval(id);
    }, [cooldown]);

    if (!email) {
        return <Navigate to="/login" replace />;
    }

    const handleResend = async () => {
        setResending(true);
        try {
            await authApi.resendVerification(email);
            toast.success("Verification email sent. Please check your inbox.");
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Could not resend the email. Try again later.");
        } finally {
            setResending(false);
        }
    };

    return (
        <GuestLayout>
        <div className="flex-1 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.0, ease: "easeOut" }}
                className="max-w-md w-full border rounded-xl shadow-lg p-8 bg-card text-card-foreground"
            >
                <div className="flex flex-col items-center text-center space-y-4 mb-6">
                    <div className="bg-primary/10 text-primary p-4 rounded-full">
                        <Mail size={36} />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight">Check your email</h2>
                    <p className="text-sm text-muted-foreground">
                        We sent a verification link to <br />
                        <span className="font-medium text-foreground">{email}</span>
                    </p>
                </div>

                <p className="text-sm text-muted-foreground text-center mb-6">
                    Click the link in the email to activate your account. The link expires in 15 minutes.
                </p>

                <Button
                    type="button"
                    className="w-full"
                    onClick={handleResend}
                    disabled={resending || cooldown > 0}
                >
                    {resending
                        ? "Sending..."
                        : cooldown > 0
                            ? `Resend in ${cooldown}s`
                            : "Resend verification email"}
                </Button>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    Already verified?{" "}
                    <Link to="/login" className="font-semibold text-primary hover:underline">
                        Log in
                    </Link>
                </div>
            </motion.div>
        </div>
        </GuestLayout>
    );
}
