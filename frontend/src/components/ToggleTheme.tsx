import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { profileApi } from "@/api/features/profile.api"
import { setTheme as setThemeAction } from "@/store/slices/auth/authSlice"
import type { RootState } from "@/store/store"
import { Check, Monitor, Moon, Sun, type LucideIcon } from "lucide-react"
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"

type Animation = "ripple" | "fade" | "none"
type ThemePreference = "light" | "dark" | "system"
type ResolvedTheme = "light" | "dark"

const THEME_STORAGE_KEY = "theme"
const THEME_PREFERENCE_KEY = "themePreference"
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)"

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === "dark" || value === "light" || value === "system"

const THEME_OPTIONS: Array<{
  value: ThemePreference
  label: string
  description: string
  Icon: LucideIcon
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
]

const getStoredThemePreference = (): ThemePreference => {
  // Prefer the auth-synced key (themePreference) so the BE → FE flow on
  // login/refresh wins over the older anonymous "theme" key.
  const synced = localStorage.getItem(THEME_PREFERENCE_KEY)
  if (isThemePreference(synced)) return synced

  const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
  if (isThemePreference(storedTheme)) return storedTheme

  return "system"
}

const getSystemTheme = (): ResolvedTheme => {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light"
}

const applyThemeToDocument = (theme: ResolvedTheme) => {
  const root = document.documentElement
  const isDark = theme === "dark"
  root.classList.toggle("dark", isDark)
  root.style.colorScheme = isDark ? "dark" : "light"
}

const resolveTheme = (
  preference: ThemePreference,
  systemTheme: ResolvedTheme,
): ResolvedTheme => {
  return preference === "system" ? systemTheme : preference
}

interface ToggleThemeProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  animation?: Animation
}

const ToggleTheme: React.FC<ToggleThemeProps> = ({
  animation = "ripple",
  className = "",
  ...props
}) => {
  const dispatch = useDispatch()
  const { isAuthenticated, theme: authTheme } = useSelector(
    (state: RootState) => state.auth,
  )
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  )
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    getSystemTheme(),
  )

  // Tracks the value last pushed to the BE to avoid PATCH-after-PATCH echoes
  // when the BE response refreshes our state.
  const lastSyncedRef = useRef<ThemePreference | null>(null)

  // BE → FE: when the auth slice carries a theme (post-login / refresh), adopt
  // it locally so multi-device theme sync works.
  useEffect(() => {
    if (!isAuthenticated) return
    if (!isThemePreference(authTheme)) return
    if (authTheme === themePreference) return
    setThemePreference(authTheme)
    lastSyncedRef.current = authTheme
  }, [isAuthenticated, authTheme, themePreference])
  const resolvedTheme = useMemo(
    () => resolveTheme(themePreference, systemTheme),
    [themePreference, systemTheme],
  )
  const isDark = resolvedTheme === "dark"

  const tooltipLabel = useMemo(() => {
    if (themePreference === "system") {
      return `Theme: System (${resolvedTheme === "dark" ? "Dark" : "Light"})`
    }

    return `Theme: ${themePreference === "dark" ? "Dark" : "Light"}`
  }, [resolvedTheme, themePreference])

  const [animKey, setAnimKey] = useState(0)
  const transitionTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  useEffect(() => {
    // Mirror to both keys so older readers (and the early boot script in
    // main.tsx that uses the raw "theme" key) stay consistent.
    localStorage.setItem(THEME_STORAGE_KEY, themePreference)
    localStorage.setItem(THEME_PREFERENCE_KEY, themePreference)
  }, [themePreference])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return

      if (
        event.newValue === "dark" ||
        event.newValue === "light" ||
        event.newValue === "system"
      ) {
        setThemePreference(event.newValue)
        return
      }

      if (event.newValue === null) {
        setThemePreference("system")
      }
    }

    window.addEventListener("storage", onStorage)

    return () => {
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const triggerThemeTransition = useCallback(() => {
    const root = document.documentElement
    root.classList.add("theme-transition")

    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
    }

    transitionTimeoutRef.current = window.setTimeout(() => {
      root.classList.remove("theme-transition")
      transitionTimeoutRef.current = null
    }, 120)
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)

    const updateSystemTheme = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    }

    updateSystemTheme()

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", updateSystemTheme)

      return () => {
        mediaQuery.removeEventListener("change", updateSystemTheme)
      }
    }

    mediaQuery.addListener(updateSystemTheme)

    return () => {
      mediaQuery.removeListener(updateSystemTheme)
    }
  }, [])

  const onSelectTheme = useCallback((nextTheme: ThemePreference) => {
    if (nextTheme === themePreference) {
      return
    }

    triggerThemeTransition()
    setAnimKey(k => k + 1)
    setThemePreference(nextTheme)

    if (isAuthenticated && lastSyncedRef.current !== nextTheme) {
      lastSyncedRef.current = nextTheme
      dispatch(setThemeAction(nextTheme))
      profileApi.updateTheme({ theme: nextTheme }).catch((err) => {
        lastSyncedRef.current = null
        logger.warn("Failed to persist theme to profile", err)
      })
    }
  }, [themePreference, triggerThemeTransition, isAuthenticated, dispatch])

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
                    animation === "ripple" ? "theme-toggle-ripple" : "theme-toggle-fade",
                  )}
                />
              )}

              <Sun
                className={cn(
                  "size-[1.1rem] transition-all duration-300",
                  isDark ? "-rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100",
                )}
              />
              <Moon
                className={cn(
                  "absolute size-[1.1rem] transition-all duration-300",
                  isDark ? "rotate-0 scale-100 opacity-100" : "rotate-90 scale-0 opacity-0",
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
          const isActive = themePreference === value

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
                <span className="text-xs text-muted-foreground">{description}</span>
              </span>

              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default ToggleTheme
