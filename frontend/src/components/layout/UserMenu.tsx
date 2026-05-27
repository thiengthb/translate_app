import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";

import type { RootState } from "@/store/store";
import { authApi } from "@/api/features/auth.api";
import { profileApi } from "@/api/features/profile.api";

export default function UserMenu() {
    const navigate = useNavigate();
    const { firstName, lastName, email } = useSelector((state: RootState) => state.auth);
    const [open, setOpen] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const ref = useRef<HTMLDivElement>(null);

    const initials = [firstName?.charAt(0), lastName?.charAt(0)]
        .filter(Boolean)
        .join("")
        .toUpperCase() || email?.charAt(0)?.toUpperCase() || "?";

    const fullName = [firstName, lastName].filter(Boolean).join(" ") || email || "User";

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Fetch avatar once
    useEffect(() => {
        let active = true;
        profileApi
            .getProfile()
            .then((data) => {
                if (active) setAvatarUrl(data.avatarUrl);
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } finally {
            navigate("/login");
        }
    };

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-accent transition-colors cursor-pointer"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full object-cover border"
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                        {initials}
                    </div>
                )}
                <ChevronDown
                    size={14}
                    className={`text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1.5 w-60 bg-popover border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    {/* Header */}
                    <div className="px-3 py-3 border-b flex items-center gap-2.5">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt="Avatar"
                                className="h-10 w-10 rounded-full object-cover border"
                            />
                        ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold">
                                {initials}
                            </div>
                        )}
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{fullName}</p>
                            <p className="text-xs text-muted-foreground truncate">{email}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="p-1">
                        <button
                            onClick={() => {
                                setOpen(false);
                                navigate("/profile");
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground hover:bg-accent transition-colors cursor-pointer"
                        >
                            <UserIcon size={15} className="opacity-70" />
                            <span>Hồ sơ cá nhân</span>
                        </button>
                        <button
                            onClick={() => {
                                setOpen(false);
                                handleLogout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-500/10 transition-colors cursor-pointer"
                        >
                            <LogOut size={15} />
                            <span>Đăng xuất</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
