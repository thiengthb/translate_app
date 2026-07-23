import { BookOpen, GraduationCap, ShieldCheck, Zap, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface DevAccount {
    label: string;
    email: string;
    password: string;
    icon: LucideIcon;
    /** Accent classes for the account pill — colour-codes each role. */
    accentClass: string;
}

/**
 * Seed accounts — match `UserDataInitializer` on the backend. Keep in sync
 * if those creds rotate.
 */
const DEV_ACCOUNTS: DevAccount[] = [
    {
        label: "Quản trị viên",
        email: "admin@example.com",
        password: "password123",
        icon: ShieldCheck,
        accentClass: "text-amber-600 dark:text-amber-400",
    },
    {
        label: "Học viên",
        email: "student@example.com",
        password: "password123",
        icon: GraduationCap,
        accentClass: "text-green-600 dark:text-green-400",
    },
    {
        label: "Giáo viên",
        email: "teacher@example.com",
        password: "password123",
        icon: BookOpen,
        accentClass: "text-blue-600 dark:text-blue-400",
    },
];

interface DevQuickLoginProps {
    /** Performs the actual login (reuses the page's 2FA-aware handler). */
    onSelect: (account: DevAccount) => void;
    disabled?: boolean;
}

/**
 * Dev-only floating quick-login.
 *
 * A round FAB pinned to the bottom-right of the screen. Hovering it (or the
 * stack above) reveals the seed accounts; clicking one logs in as that user.
 * The whole thing is stripped from production via `import.meta.env.DEV`.
 *
 *        ┌────────────────┐
 *        │  🛡  Admin      │   ← revealed on hover
 *        │  🎓 Student     │
 *        │  📖 Teacher     │
 *        └────────────────┘
 *                     (⚡)   ← always-visible round trigger
 */
export function DevQuickLogin({ onSelect, disabled = false }: DevQuickLoginProps) {
    if (!import.meta.env.DEV) return null;

    return (
        <div className="group fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Account list — hidden until the group is hovered. `pb-3` keeps the
                hover area contiguous with the FAB so the cursor can travel up
                without the menu collapsing in the gap. */}
            <div
                className={cn(
                    "flex flex-col items-end gap-2 pb-3",
                    "pointer-events-none translate-y-2 opacity-0 transition-all duration-200",
                    "group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100",
                )}
            >
                {DEV_ACCOUNTS.map((account) => {
                    const Icon = account.icon;
                    return (
                        <button
                            key={account.email}
                            type="button"
                            disabled={disabled}
                            onClick={() => onSelect(account)}
                            title={account.email}
                            className={cn(
                                "flex items-center gap-2 rounded-full border bg-background/95 py-1 pl-1.5 pr-3 shadow-md backdrop-blur",
                                "ring-1 ring-border/60 transition-all hover:scale-[1.03] hover:shadow-lg active:scale-95",
                                "cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted",
                                    account.accentClass,
                                )}
                            >
                                <Icon size={13} />
                            </span>
                            <span className="text-xs font-medium text-foreground">
                                {account.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Round trigger */}
            <button
                type="button"
                disabled={disabled}
                aria-label="Đăng nhập nhanh (dev)"
                title="Dev — Đăng nhập nhanh"
                className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full shadow-md",
                    "bg-amber-500 text-white ring-2 ring-amber-500/20 transition-all",
                    "hover:bg-amber-600 hover:scale-105 active:scale-95",
                    "group-hover:rotate-12 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60",
                )}
            >
                <Zap size={16} className="fill-current" />
            </button>
        </div>
    );
}
