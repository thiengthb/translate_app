import type { ReactNode } from "react";
import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { cn } from "@/lib/utils";

/**
 * Glassmorphism gate for personal-only widgets shown to guests.
 *
 * Blurs its children behind a `backdrop-blur-sm bg-white/40` layer and floats a
 * call-to-action badge on top. Clicking the CTA pops the shared auth modal
 * (login/register happen in place) — it never navigates the guest away. Use it
 * to wrap widgets like "Nhiệm vụ điểm danh", "Lịch học tập" or the EXP tracker
 * on the guest dashboard.
 */
export function GatedOverlay({
    children,
    message = "Đăng nhập để điểm danh & lưu tiến trình",
    cta = "Đăng nhập",
    className,
    rounded = "rounded-[24px]",
}: {
    children: ReactNode;
    /** CTA badge copy shown over the blurred widget. */
    message?: string;
    /** Button label. */
    cta?: string;
    className?: string;
    /** Match the wrapped widget's corner radius so the glass layer lines up. */
    rounded?: string;
}) {
    const { openLogin } = useAuthModal();

    return (
        <div className={cn("relative", className)}>
            <div className="pointer-events-none select-none opacity-80 blur-[2px]" aria-hidden>
                {children}
            </div>
            <div
                className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/40 px-4 text-center backdrop-blur-sm",
                    rounded,
                )}
            >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FFE5EC] text-[#FF6B9D] shadow-sm">
                    <Lock className="h-5 w-5" />
                </span>
                <p className="max-w-[280px] text-sm font-semibold text-[#3A2E33]">{message}</p>
                <Button size="sm" onClick={() => openLogin()} className="rounded-full">
                    {cta}
                </Button>
            </div>
        </div>
    );
}
