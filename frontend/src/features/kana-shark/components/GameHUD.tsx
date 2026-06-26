import type { ReactNode } from "react";
import { motion } from "motion/react";
import { Clock, Heart, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanaSharkGameStatus } from "../types/kanaShark.types";

interface GameHUDProps {
  status: KanaSharkGameStatus;
  hp: number;
  maxHp: number;
  score: number;
  combo: number;
  secondsLeft: number;
}

/**
 * Translucent in-canvas HUD strip. Floats over the top of the play area so the
 * stats stay readable without stealing layout height from the game screen.
 */
export function GameHUD({ status, hp, maxHp, score, combo, secondsLeft }: GameHUDProps) {
  const lowTime = status === "playing" && secondsLeft <= 10;
  const lowHp = hp <= 1;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-2 bg-gradient-to-b from-slate-950/85 via-slate-950/40 to-transparent px-3 py-2.5">
      <StatusPill status={status} />
      <div className="ml-auto flex items-center gap-1.5">
        <StatPill icon={<Heart className={cn("size-3.5", lowHp ? "animate-pulse" : "")} />} value={`${hp}/${maxHp}`} tone={lowHp ? "danger" : "rose"} pulseKey={hp} />
        <StatPill icon={<Trophy className="size-3.5" />} value={score.toLocaleString()} tone="amber" pulseKey={score} />
        <StatPill icon={<Sparkles className="size-3.5" />} value={`x${combo}`} tone={combo >= 3 ? "hot" : "cyan"} pulseKey={combo} />
        <StatPill icon={<Clock className={cn("size-3.5", lowTime ? "animate-pulse" : "")} />} value={`${secondsLeft}s`} tone={lowTime ? "danger" : "sky"} />
      </div>
    </div>
  );
}

const TONE_ICON: Record<string, string> = {
  rose: "text-rose-400",
  amber: "text-amber-400",
  cyan: "text-cyan-400",
  sky: "text-sky-400",
  hot: "text-cyan-300",
  danger: "text-rose-400",
};

function StatPill({
  icon,
  value,
  tone,
  pulseKey,
}: {
  icon: ReactNode;
  value: string;
  tone: keyof typeof TONE_ICON;
  pulseKey?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-bold text-white ring-1 ring-white/10 backdrop-blur-sm",
        tone === "danger" && "ring-rose-400/50",
        tone === "hot" && "ring-cyan-400/50",
      )}
    >
      <span className={TONE_ICON[tone]}>{icon}</span>
      <motion.span
        key={pulseKey}
        initial={pulseKey != null ? { scale: 1.3 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 16 }}
        className="tabular-nums"
      >
        {value}
      </motion.span>
    </div>
  );
}

function StatusPill({ status }: { status: KanaSharkGameStatus }) {
  const map: Record<string, { label: string; cls: string }> = {
    playing: { label: "Playing", cls: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30" },
    paused: { label: "Paused", cls: "bg-amber-500/20 text-amber-300 ring-amber-400/30" },
    finished: { label: "Finished", cls: "bg-sky-500/20 text-sky-300 ring-sky-400/30" },
    loading: { label: "Loading", cls: "bg-slate-500/20 text-slate-200 ring-white/20" },
    error: { label: "Error", cls: "bg-rose-500/20 text-rose-300 ring-rose-400/30" },
    ready: { label: "Ready", cls: "bg-cyan-500/20 text-cyan-300 ring-cyan-400/30" },
    idle: { label: "Idle", cls: "bg-slate-500/20 text-slate-200 ring-white/20" },
  };
  const entry = map[status] ?? map.idle;
  return (
    <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 backdrop-blur-sm", entry.cls)}>
      {entry.label}
    </span>
  );
}
