import { Clock, LogOut, Pin, Settings2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { InfoLabel } from "@/components/common/InfoLabel";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarFooter, useSidebar } from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";

import type { SidebarPreferences } from "./hooks/useSidebarPreferences";

interface SidebarSettingsProps {
    preferences: SidebarPreferences;
    setPreference: <K extends keyof SidebarPreferences>(
        key: K,
        value: SidebarPreferences[K],
    ) => void;
}

/**
 * Sidebar footer — two icon-only actions sitting side by side, each with
 * a descriptive tooltip:
 *
 *   ┌──────────────────────────┐
 *   │ ⚙ ................. 🚪   │  ← settings (left) · logout (right)
 *   └──────────────────────────┘
 *
 * The ⚙ button opens a dropdown (styled like the user-avatar menu) that
 * toggles the two optional sidebar sections. Each row keeps a terse label
 * and tucks its explanation behind an ⓘ InfoLabel so the menu stays clean:
 *
 *   ┌─────────────────────────────┐
 *   │ Hiển thị sidebar            │
 *   ├─────────────────────────────┤
 *   │ ⏱ Gần đây ⓘ        [ ●——] │
 *   │ 📌 Đã ghim ⓘ       [ ●——] │
 *   └─────────────────────────────┘
 *
 * When the sidebar is collapsed (icon mode) the two buttons stack
 * vertically so they each stay centered in the 48px rail.
 */
export function SidebarSettings({
    preferences,
    setPreference,
}: SidebarSettingsProps) {
    const { state } = useSidebar();
    const isCollapsed = state !== "expanded";
    const handleLogout = useLogout();
    const tooltipSide = isCollapsed ? "right" : "top";

    return (
        <SidebarFooter className="border-t border-sidebar-border">
            <div
                className={cn(
                    "flex items-center gap-1",
                    isCollapsed ? "flex-col" : "flex-row justify-between",
                )}
            >
                {/* ── Settings (left) ──────────────────────────────────── */}
                <DropdownMenu>
                    <TooltipWrapper
                        content="Cài đặt hiển thị sidebar"
                        side={tooltipSide}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Cài đặt hiển thị sidebar"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            >
                                <Settings2 className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                    </TooltipWrapper>

                    <DropdownMenuContent
                        side={isCollapsed ? "right" : "top"}
                        align="start"
                        className="w-60"
                    >
                        <DropdownMenuLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Hiển thị sidebar
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        <ToggleRow
                            icon={Clock}
                            label="Gần đây"
                            info="Hiển thị các mục bạn vừa truy cập gần nhất ở đầu sidebar."
                            checked={preferences.showRecent}
                            onToggle={() =>
                                setPreference("showRecent", !preferences.showRecent)
                            }
                        />
                        <ToggleRow
                            icon={Pin}
                            label="Đã ghim"
                            info="Hiển thị các mục bạn đã ghim để truy cập nhanh ở đầu sidebar."
                            checked={preferences.showPinned}
                            onToggle={() =>
                                setPreference("showPinned", !preferences.showPinned)
                            }
                        />
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* ── Logout (right) ───────────────────────────────────── */}
                <TooltipWrapper
                    content="Đăng xuất khỏi tài khoản"
                    side={tooltipSide}
                >
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        aria-label="Đăng xuất khỏi tài khoản"
                        className="h-8 w-8 text-rose-600 hover:text-rose-600 hover:bg-rose-500/10"
                    >
                        <LogOut className="size-4" />
                    </Button>
                </TooltipWrapper>
            </div>
        </SidebarFooter>
    );
}

// ─── Toggle row ──────────────────────────────────────────────────────────────
/**
 * One switch row inside the settings dropdown, visually matching the
 * avatar menu's `MenuRow`: a soft icon chip, a terse label with an ⓘ
 * tooltip for the explanation, and a display-only switch on the right.
 *
 * The whole row is the hit target — `onSelect`'s default is prevented so
 * the menu stays open across toggles, and the switch is `pointer-events-
 * none` so a click anywhere on the row drives the single `onToggle`.
 */
function ToggleRow({
    icon: Icon,
    label,
    info,
    checked,
    onToggle,
}: {
    icon: LucideIcon;
    label: string;
    info: string;
    checked: boolean;
    onToggle: () => void;
}) {
    return (
        <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={onToggle}
            className="group gap-2.5 rounded-md px-2 py-2 text-sm cursor-pointer"
        >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-focus:bg-primary/10 group-focus:text-primary">
                <Icon size={15} />
            </span>
            <InfoLabel
                title={<span className="font-normal">{label}</span>}
                info={info}
                side="top"
                className="flex-1"
            />
            <Switch checked={checked} className="pointer-events-none" />
        </DropdownMenuItem>
    );
}
