import { GraduationCap, Grid2x2, Layers, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyMode } from "./types";

interface ModeDef {
  mode: StudyMode;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeDef[] = [
  { mode: "SRS", label: "SRS Review", icon: Repeat },
  { mode: "FLASHCARD", label: "Flashcard", icon: Layers },
  { mode: "LEARN", label: "Learn", icon: GraduationCap },
  { mode: "MATCH", label: "Match", icon: Grid2x2 },
];

interface ModeBarProps {
  mode: StudyMode;
  onChange: (mode: StudyMode) => void;
  /** Cards due today, shown as a badge on the SRS tab. */
  srsDue?: number;
}

/**
 * Horizontal selector across all six study modes. Switching modes never
 * navigates away — it swaps the active mode component in place. The SRS tab
 * carries a due-count badge so the learner can see retention work at a glance.
 */
export function ModeBar({ mode, onChange, srsDue }: ModeBarProps) {
  return (
    <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {MODES.map(({ mode: m, label, icon: Icon }) => {
        const active = m === mode;
        const showDue = m === "SRS" && typeof srsDue === "number" && srsDue > 0;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            aria-pressed={active}
            className={cn(
              "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
            {showDue && (
              <span
                className={cn(
                  "ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/15 text-primary"
                )}
              >
                {srsDue}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
