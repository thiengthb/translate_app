import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { COLOR_PRESETS } from "@/lib/color-presets";
import { iconMap, type IconKey } from "@/components/datatable/iconMap";

/* ─── Curated icon list for decks ─── */
const DECK_ICONS: IconKey[] = [
  "book-open", "graduation-cap", "layers", "folder", "file-text",
  "bookmark", "clipboard-check", "tags", "star", "globe",
  "code", "terminal", "database", "rocket", "cpu",
  "music", "mic", "camera", "video", "image",
  "bar-chart", "pie-chart", "activity", "trending-up", "search",
  "settings", "bell", "mail", "message", "calendar",
  "users", "user", "briefcase", "building", "package",
  "shield-check", "key-round", "info", "help", "map-pin",
];

/* Only vibrant presets — skip near-grays */
const COLOR_OPTIONS = COLOR_PRESETS.filter(
  (p) => !["slate", "stone"].includes(p.id)
);

/**
 * Sentinel color id meaning "follow the app's accent color". Decks stored with
 * this value (or no color at all) render with `var(--primary)`, so they re-tint
 * automatically whenever the user changes the app's color preset.
 */
export const APP_COLOR = "app";
/** CSS value the app-color option resolves to (the live themed accent). */
export const APP_COLOR_CSS = "var(--primary)";

export const DEFAULT_ICON:  IconKey = "book-open";
/** New decks default to the app color so they match the current theme. */
export const DEFAULT_COLOR = APP_COLOR;

interface DeckIconColorPickerProps {
  icon: string;
  color: string;
  onChange: (icon: string, color: string) => void;
  /** Compact mode — renders a small icon-only button without label text. */
  compact?: boolean;
}

export function DeckIconColorPicker({ icon, color, onChange, compact }: DeckIconColorPickerProps) {
  const [open, setOpen] = useState(false);

  // No explicit color (or the "app" sentinel) → follow the app's themed accent.
  const isAppColor    = !color || color === APP_COLOR;
  const activeColor   = COLOR_OPTIONS.find((c) => c.id === color);
  const activeBg      = isAppColor ? APP_COLOR_CSS : (activeColor?.swatch ?? APP_COLOR_CSS);
  const activeName    = isAppColor ? "Theo màu app" : (activeColor?.name ?? "Theo màu app");
  const IconComponent = iconMap[icon as IconKey] ?? iconMap[DEFAULT_ICON]!;

  return (
    <div className="relative">
      {/* ── Trigger ── */}
      {compact ? (
        /* Compact: colored icon + "Icon" label with tooltip */
        <TooltipWrapper
          content="Đổi biểu tượng và màu nền cho deck"
          side="bottom"
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 h-9 px-2 rounded-lg border border-border text-sm font-medium transition-all hover:bg-accent",
              open && "ring-2 ring-primary/40 bg-primary/5 border-primary/40"
            )}
          >
            <span
              className={cn(
                "size-6 rounded-md flex items-center justify-center shrink-0 transition-transform",
                open && "scale-105"
              )}
              style={{ background: activeBg }}
            >
              <IconComponent className="size-3.5 text-white" />
            </span>
            <span className="text-muted-foreground">Icon</span>
          </button>
        </TooltipWrapper>
      ) : (
        /* Full: icon + label + chevron */
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all",
            open
              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
              : "border-border hover:border-foreground/30 hover:bg-accent/50"
          )}
        >
          <span
            className="size-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: activeBg }}
          >
            <IconComponent className="size-5 text-white" />
          </span>
          <div className="text-left min-w-0">
            <p className="text-xs font-semibold text-foreground leading-tight">Biểu tượng & màu</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{activeName}</p>
          </div>
          <ChevronDown className={cn(
            "size-3.5 text-muted-foreground ml-auto shrink-0 transition-transform duration-150",
            open && "rotate-180"
          )} />
        </button>
      )}

      {/* ── Picker dropdown ── */}
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute left-0 top-full mt-2 z-40 w-80 rounded-xl border border-border bg-popover shadow-xl p-4 space-y-4"
            >
              {/* Preview header */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <span
                  className="size-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ background: activeBg }}
                >
                  <IconComponent className="size-6 text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{activeName}</p>
                  <p className="text-xs text-muted-foreground">{icon}</p>
                </div>
              </div>

              {/* Icon grid */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Biểu tượng
                </p>
                <div className="grid grid-cols-8 gap-1">
                  {DECK_ICONS.map((key) => {
                    const Ic = iconMap[key]!;
                    const isActive = icon === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        title={key}
                        onClick={() => onChange(key, color)}
                        className={cn(
                          "size-9 rounded-lg flex items-center justify-center transition-all hover:bg-accent",
                          isActive
                            ? "ring-2 ring-primary bg-primary/10 scale-105"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Ic className="size-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color swatches */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                  Màu nền
                </p>
                <div className="flex flex-wrap gap-2">
                  {/* App color — follows the current theme accent; the default. */}
                  <button
                    type="button"
                    title="Theo màu app — đổi theo chủ đề hiện tại"
                    onClick={() => onChange(icon, APP_COLOR)}
                    style={{ background: APP_COLOR_CSS }}
                    className={cn(
                      "relative flex size-7 items-center justify-center rounded-full transition-all hover:scale-110",
                      isAppColor
                        ? "ring-2 ring-offset-2 ring-offset-popover ring-primary scale-110"
                        : "opacity-75 hover:opacity-100"
                    )}
                  >
                    <Sparkles className="size-3.5 text-primary-foreground" />
                  </button>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      title={c.name}
                      onClick={() => onChange(icon, c.id)}
                      style={{ background: c.swatch }}
                      className={cn(
                        "size-7 rounded-full transition-all hover:scale-110",
                        color === c.id
                          ? "ring-2 ring-offset-2 ring-offset-popover ring-primary scale-110"
                          : "opacity-75 hover:opacity-100"
                      )}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
