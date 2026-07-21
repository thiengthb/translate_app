import { Link } from "react-router-dom";
import {
    BookOpen,
    Home,
    Languages,
    type LucideIcon,
} from "lucide-react";

import { HanabunMark } from "@/components/branding/HanabunLogo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PINK = "#FF8FAB";
const PINK_DEEP = "#FF6B9D";

export type GuestTab = "dashboard" | "word" | "translate";

type NavItem = {
    key: GuestTab;
    label: string;
    icon: LucideIcon;
};

const NAV: NavItem[] = [
    { key: "dashboard", label: "Tổng quan", icon: Home },
    { key: "word", label: "Tra từ vựng", icon: BookOpen },
    { key: "translate", label: "Dịch thuật", icon: Languages },
];

/**
 * Guest sidebar (labeled) — mirrors the authenticated Sakura rail's candy
 * styling, but wide enough to show text labels so a first-time visitor knows
 * exactly what each tool does. Holds the guest-usable tools + the Đăng nhập /
 * Đăng ký buttons pinned at the bottom.
 */
export function GuestSidebar({
    tab,
    onTabChange,
}: {
    tab: GuestTab;
    onTabChange: (next: GuestTab) => void;
}) {
    return (
        <aside className="flex w-full flex-none flex-col rounded-t-[36px] border-b border-[#FBEAF0] bg-white px-4 py-6 lg:w-60 lg:rounded-t-none lg:rounded-l-[36px] lg:border-b-0 lg:border-r lg:py-7">
            {/* Brand */}
            <Link to="/" className="mb-6 flex items-center gap-2.5 px-2 lg:mb-8">
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[12px] border border-[#FFC2D4] bg-[#FFF0F4] p-0.5">
                    <HanabunMark />
                </div>
                <span className="font-display text-lg font-bold text-[#FF6B9D]">Hanabun</span>
            </Link>

            {/* Nav */}
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-[#B9AEB2]">
                Công cụ
            </p>
            <nav className="flex flex-row flex-wrap gap-1.5 lg:flex-col">
                {NAV.map((item) => {
                    const active = item.key === tab;
                    return (
                        <button
                            key={item.key}
                            type="button"
                            onClick={() => onTabChange(item.key)}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
                                active
                                    ? "text-white"
                                    : "text-[#3A2E33] hover:bg-[#FFF0F4] hover:text-[#FF6B9D]",
                            )}
                            style={
                                active
                                    ? {
                                          background: `linear-gradient(145deg, ${PINK}, ${PINK_DEEP})`,
                                          boxShadow: "0 8px 18px rgba(255,143,171,0.4)",
                                      }
                                    : undefined
                            }
                        >
                            <span className="flex h-6 w-6 items-center justify-center">
                                <item.icon className="h-[20px] w-[20px]" />
                            </span>
                            <span className="truncate">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Auth actions pinned to the bottom */}
            <div className="mt-6 flex flex-col gap-2 lg:mt-auto lg:pt-6">
                <div className="rounded-2xl bg-[#FFF7F9] p-3 text-center">
                    <p className="mb-2 text-xs text-[#9A8E92]">
                        Đăng nhập để lưu từ, flashcard và tiến độ học.
                    </p>
                    <Button asChild className="w-full">
                        <Link to="/login">Đăng nhập</Link>
                    </Button>
                    <Button asChild variant="outline" className="mt-2 w-full">
                        <Link to="/register">Đăng ký</Link>
                    </Button>
                </div>
            </div>
        </aside>
    );
}
