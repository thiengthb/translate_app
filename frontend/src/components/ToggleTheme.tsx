import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useThemePreference,
  type ThemePreference,
} from "@/hooks/useThemePreference";
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

type Animation = "ripple" | "fade" | "none";

export const THEME_OPTIONS: Array<{
  value: ThemePreference;
  label: string;
  description: string;
  Icon: LucideIcon;
}> = [
  {
    value: "light",
    label: "Light",
    description: "Bright interface",
    Icon: Sun,
  },
  {
    value: "dark",
    label: "Dark",
    description: "Low-light friendly",
    Icon: Moon,
  },
  {
    value: "system",
    label: "System",
    description: "Match your device",
    Icon: Monitor,
  },
];

interface ToggleThemeProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  animation?: Animation;
}

/**
 * Standalone theme toggle button — used in the guest navbar where there's
 * no avatar dropdown to nest preferences inside. The user dropdown
 * renders theme options inline via the same `useThemePreference` hook,
 * so the two stay in lockstep.
 */
const ToggleTheme: React.FC<ToggleThemeProps> = ({
  animation = "ripple",
  className = "",
  ...props
}) => {
  const {
    themePreference,
    resolvedTheme,
    isDark,
    setThemePreference,
  } = useThemePreference();

  const tooltipLabel = useMemo(() => {
    if (themePreference === "system") {
      return `Theme: System (${resolvedTheme === "dark" ? "Dark" : "Light"})`;
    }
    return `Theme: ${themePreference === "dark" ? "Dark" : "Light"}`;
  }, [resolvedTheme, themePreference]);

  // ─── Visual ripple/fade transition on switch (cosmetic only) ────────────
  const [animKey, setAnimKey] = useState(0);

  const onSelectTheme = useCallback(
    (nextTheme: ThemePreference) => {
      if (nextTheme === themePreference) return;
      // The smooth color cross-fade is owned by `setThemePreference`
      // (shared `playThemeTransition`); here we only fire the button's
      // cosmetic ripple.
      setAnimKey((k) => k + 1);
      setThemePreference(nextTheme);
    },
    [themePreference, setThemePreference],
  );

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Change theme"
              aria-pressed={isDark}
              className={cn(
                "relative rounded-full border-border/70 transition-all",
                "hover:shadow-sm dark:border-slate-700/70",
                className,
              )}
              {...props}
            >
              {animation !== "none" && (
                <span
                  key={animKey}
                  aria-hidden
                  className={cn(
                    "absolute inset-0 rounded-full",
                    animation === "ripple"
                      ? "theme-toggle-ripple"
                      : "theme-toggle-fade",
                  )}
                />
              )}
              <Sun
                className={cn(
                  "size-[1.1rem] transition-all duration-300",
                  isDark
                    ? "-rotate-90 scale-0 opacity-0"
                    : "rotate-0 scale-100 opacity-100",
                )}
              />
              <Moon
                className={cn(
                  "absolute size-[1.1rem] transition-all duration-300",
                  isDark
                    ? "rotate-0 scale-100 opacity-100"
                    : "rotate-90 scale-0 opacity-0",
                )}
              />
              {themePreference === "system" && (
                <span className="absolute -right-0.5 -bottom-0.5 inline-flex size-4 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
                  <Monitor className="size-2.5" />
                </span>
              )}
              <span className="sr-only">Change theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tooltipLabel}</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
        {THEME_OPTIONS.map(({ value, label, description, Icon }) => {
          const isActive = themePreference === value;
          return (
            <DropdownMenuItem
              key={value}
              onSelect={() => onSelectTheme(value)}
              className={cn(
                "group gap-3 rounded-lg px-2 py-2",
                isActive && "bg-accent",
              )}
            >
              <span
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-md",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              </span>
              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ToggleTheme;
