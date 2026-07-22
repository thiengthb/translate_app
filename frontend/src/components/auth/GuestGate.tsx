import { Lock, LogIn, UserPlus } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";

/**
 * In-shell "this feature needs an account" gate.
 *
 * Rendered by {@link ProtectedRoute} when a guest lands on an inherently
 * personal route (Profile, Notebook, Stats, the Kanji SRS home…). It keeps the
 * guest on the same URL inside the normal shell — no redirect to /login — and
 * invites them to sign in via the shared auth modal (login/register happen in
 * place). Because it replaces the real page component, none of that page's
 * authenticated queries ever fire.
 */
export function GuestGate({
    title = "Tính năng cần đăng nhập",
    message = "Đăng nhập hoặc tạo tài khoản Hanabun miễn phí để dùng tính năng này và lưu lại tiến trình học của bạn.",
}: {
    title?: string;
    message?: string;
}) {
    const { openLogin, openRegister } = useAuthModal();

    return (
        <MainLayout>
            <div className="flex min-h-[60vh] flex-1 flex-col items-center justify-center px-4">
                <div className="w-full max-w-md rounded-[28px] border border-[#FBEAF0] bg-white p-8 text-center shadow-[0_18px_50px_rgba(255,143,171,0.16)]">
                    <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFE5EC] text-[#FF6B9D]">
                        <Lock className="h-7 w-7" />
                    </span>
                    <h2 className="font-display text-2xl font-bold text-[#3A2E33]">{title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-[#9A8E92]">{message}</p>
                    <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                        <Button onClick={() => openLogin()} className="gap-1.5 rounded-full">
                            <LogIn className="h-4 w-4" />
                            Đăng nhập
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => openRegister()}
                            className="gap-1.5 rounded-full"
                        >
                            <UserPlus className="h-4 w-4" />
                            Đăng ký miễn phí
                        </Button>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
