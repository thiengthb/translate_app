import { Check, ChevronDown, GraduationCap, Grid2x2, Layers, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  /** Cards due today — badged on the SRS entry. */
  srsDue?: number;
}

const hasDue = (srsDue?: number): srsDue is number => typeof srsDue === "number" && srsDue > 0;

function DueBadge({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/15 px-1.5 text-[11px] font-bold tabular-nums text-primary">
      {value}
    </span>
  );
}

/**
 * Single "choose mode" dropdown: the trigger shows the active mode; the menu
 * lists every mode. Switching never navigates away — it swaps the active mode
 * component in place. The SRS entry carries a due-count badge.
 */
export function ModeBar({ mode, onChange, srsDue }: ModeBarProps) {
  const current = MODES.find((m) => m.mode === mode) ?? MODES[0];
  const CurrentIcon = current.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <CurrentIcon className="size-4 text-primary" />
          <span>{current.label}</span>
          {mode === "SRS" && hasDue(srsDue) && <DueBadge value={srsDue} />}
          <ChevronDown className="size-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        {MODES.map(({ mode: m, label, icon: Icon }) => {
          const active = m === mode;
          return (
            <DropdownMenuItem
              key={m}
              onClick={() => onChange(m)}
              className={cn("gap-2", active && "bg-accent")}
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="flex-1">{label}</span>
              {m === "SRS" && hasDue(srsDue) && <DueBadge value={srsDue} />}
              {active && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
