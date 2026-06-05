import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookText,
  Check,
  ChevronDown,
  DoorOpen,
  Layers,
  Library,
  Monitor,
  Moon,
  ScrollText,
  Settings,
  Sun,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { usePermissions } from "@/hooks/usePermissions";
import {
  useThemePreference,
  type ThemePreference,
} from "@/hooks/useThemePreference";
import { getHomePathByRole } from "@/utils/rbac.utils";
import { cn } from "@/lib/utils";

const CONTENT_ITEMS = [
  { label: "Decks", desc: "Bộ Hán tự để học", icon: Layers, to: "/kanji-study/decks" },
  { label: "Bộ Thủ", desc: "214 bộ thủ Kanji", icon: Library, to: "/kanji-study/radicals" },
  { label: "Bài đọc", desc: "Luyện đọc theo cấp độ", icon: ScrollText, to: "/kanji-study/reading" },
];

const THEME_ITEMS: Array<{
  value: ThemePreference;
  label: string;
  desc: string;
  icon: LucideIcon;
}> = [
  { value: "light", label: "Sáng", desc: "Giao diện sáng", icon: Sun },
  { value: "dark", label: "Tối", desc: "Dịu mắt khi thiếu sáng", icon: Moon },
  { value: "system", label: "Hệ thống", desc: "Theo hệ điều hành", icon: Monitor },
];

/**
 * In-page top nav for the Kanji study area — modelled on Bunpro's header.
 * Replaces the GENGO sidebar while inside this feature: brand + home on the
 * left, the Content dropdown and a "back to Gengo" exit on the right.
 */
export function KanjiStudyHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { activeRole } = usePermissions();
  const { themePreference, resolvedTheme, setThemePreference } =
    useThemePreference();
  const isHome = location.pathname === "/kanji-study";
  const exitTo = getHomePathByRole(activeRole);

  return (
    <header className="sticky top-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        <Link to="/kanji-study" className="flex items-center gap-2 group">
          <span className="grid place-items-center h-9 w-9 rounded-xl bg-rose-500 text-white font-serif text-xl shadow-sm group-hover:bg-rose-600 transition-colors">
            漢
          </span>
          <span className="font-bold text-lg text-foreground hidden sm:inline">Kanji Study</span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            to="/kanji-study"
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
              isHome ? "text-rose-500" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            Trang chủ
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger className="px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors inline-flex items-center gap-1 outline-none">
              <BookText size={15} />
              Content
              <ChevronDown size={14} className="opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2">
              {CONTENT_ITEMS.map((item) => (
                <DropdownMenuItem
                  key={item.to}
                  onClick={() => navigate(item.to)}
                  className="gap-3 p-2.5 rounded-lg cursor-pointer"
                >
                  <span className="grid place-items-center h-9 w-9 shrink-0 rounded-lg bg-muted text-rose-500">
                    <item.icon size={18} />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <TooltipWrapper content="Cài đặt giao diện">
              <DropdownMenuTrigger
                aria-label="Cài đặt"
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors outline-none"
              >
                <Settings size={17} />
              </DropdownMenuTrigger>
            </TooltipWrapper>
            <DropdownMenuContent align="end" className="w-56 p-1.5">
              <DropdownMenuLabel className="text-xs text-muted-foreground font-normal px-2 pt-1.5 pb-1">
                Giao diện
              </DropdownMenuLabel>
              {THEME_ITEMS.map((item) => {
                const active = themePreference === item.value;
                return (
                  <DropdownMenuItem
                    key={item.value}
                    onSelect={() => setThemePreference(item.value)}
                    className={cn(
                      "gap-3 rounded-lg px-2 py-2 cursor-pointer",
                      active && "bg-accent",
                    )}
                  >
                    <span
                      className={cn(
                        "grid place-items-center h-7 w-7 shrink-0 rounded-md",
                        active
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <item.icon size={15} />
                    </span>
                    <span className="flex flex-col min-w-0 flex-1 leading-tight">
                      <span className="text-sm font-medium text-foreground">
                        {item.label}
                        {item.value === "system" && (
                          <span className="text-muted-foreground font-normal">
                            {" "}
                            ({resolvedTheme === "dark" ? "Tối" : "Sáng"})
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.desc}
                      </span>
                    </span>
                    {active && <Check size={15} className="text-rose-500" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => navigate("/settings")}
                className="gap-2 rounded-lg px-2 py-2 cursor-pointer text-muted-foreground"
              >
                <Settings size={15} />
                <span className="text-sm">Cài đặt khác…</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="mx-1 h-5 w-px bg-border" aria-hidden />

          <TooltipWrapper content="Quay lại Gengo">
            <button
              onClick={() => navigate(exitTo)}
              aria-label="Quay lại Gengo"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <DoorOpen size={16} />
              <span className="hidden sm:inline">Gengo</span>
            </button>
          </TooltipWrapper>
        </nav>
      </div>
    </header>
  );
}
