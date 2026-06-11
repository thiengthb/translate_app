import type { ReactNode } from "react";
import { Gauge, Hash, Loader2, Pause, Play, RotateCcw, Settings2, Timer, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DeckDTO } from "@/types";
import type {
  KanaSharkGameStatus,
  KanaSharkPerformanceMode,
  KanaSharkSettings,
} from "../types/kanaShark.types";

interface GameSetupPanelProps {
  decks: DeckDTO[];
  selectedDeckId: number | null;
  settings: KanaSharkSettings;
  status: KanaSharkGameStatus;
  decksLoading: boolean;
  itemsLoading: boolean;
  itemsCount: number;
  onDeckChange: (deckId: number) => void;
  onSettingsChange: (patch: Partial<KanaSharkSettings>) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function GameSetupPanel({
  decks,
  selectedDeckId,
  settings,
  status,
  decksLoading,
  itemsLoading,
  itemsCount,
  onDeckChange,
  onSettingsChange,
  onStart,
  onPause,
  onResume,
  onReset,
}: GameSetupPanelProps) {
  const locked = status === "playing" || status === "paused";
  const startDisabled = decksLoading || itemsLoading || selectedDeckId == null || locked;
  const selectableDecks = decks.filter((deck): deck is DeckDTO & { id: number } => typeof deck.id === "number");

  return (
    <section className="relative overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 via-cyan-50 to-emerald-50/60 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute -right-10 -top-12 size-36 rounded-full bg-cyan-300/25 blur-3xl dark:bg-cyan-500/10" />

      <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
        {/* Identity */}
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/30">
            <Waves className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight">Kana Shark</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-cyan-700 ring-1 ring-cyan-200 dark:bg-slate-800 dark:text-cyan-300 dark:ring-slate-700">
                <span className={cn("size-1.5 rounded-full", itemsCount > 0 ? "animate-pulse bg-emerald-500" : "bg-slate-400")} />
                {itemsCount} playable
              </span>
            </div>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Gõ đúng cách đọc để hạ cá mập — ghi thẳng vào Anki review log.
            </p>
          </div>
        </div>

        {/* Controls + actions pushed right */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {/* Deck — primary control */}
          <Select
            value={selectedDeckId == null ? undefined : String(selectedDeckId)}
            disabled={locked || decksLoading || selectableDecks.length === 0}
            onValueChange={(value) => onDeckChange(Number(value))}
          >
            <SelectTrigger className="h-9 w-44 border-cyan-200 bg-white/80 sm:w-56 dark:border-slate-700 dark:bg-slate-800/70">
              <SelectValue placeholder={decksLoading ? "Đang tải deck..." : "Chọn deck"} />
            </SelectTrigger>
            <SelectContent>
              {selectableDecks.map((deck) => (
                <SelectItem key={deck.id} value={String(deck.id)}>
                  {deck.title ?? `Deck #${deck.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Mode — segmented toggle */}
          <div className="inline-flex rounded-lg border bg-white/70 p-0.5 dark:border-slate-700 dark:bg-slate-800/70">
            {(["ROMAJI", "KANA"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                disabled={locked}
                onClick={() => onSettingsChange({ mode })}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  settings.mode === mode
                    ? "bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                  locked && "cursor-not-allowed opacity-60",
                )}
              >
                {mode === "ROMAJI" ? "Romaji" : "Kana"}
              </button>
            ))}
          </div>

          {/* Advanced options — popover keeps the bar tidy */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 bg-white/70 dark:bg-slate-800/70">
                <Settings2 className="size-4" />
                <span className="hidden sm:inline">Tùy chọn</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-60 space-y-3">
              <OptionRow label="Items" icon={<Hash className="size-3.5" />}>
                <Select
                  value={String(settings.maxItems)}
                  disabled={locked}
                  onValueChange={(value) => onSettingsChange({ maxItems: Number(value) })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 30].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value} items
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionRow>

              <OptionRow label="Duration" icon={<Timer className="size-3.5" />}>
                <Select
                  value={String(settings.roundSeconds)}
                  disabled={locked}
                  onValueChange={(value) => onSettingsChange({ roundSeconds: Number(value) })}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[45, 60, 90].map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}s
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </OptionRow>

              <OptionRow label="Performance" icon={<Gauge className="size-3.5" />}>
                <Select
                  value={settings.performanceMode}
                  disabled={locked}
                  onValueChange={(value) =>
                    onSettingsChange({
                      performanceMode: value as KanaSharkPerformanceMode,
                      maxEnemies: value === "performance" ? 2 : 3,
                    })
                  }
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="performance">Low effects</SelectItem>
                  </SelectContent>
                </Select>
              </OptionRow>
            </PopoverContent>
          </Popover>

          <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" />

          {/* Primary actions */}
          {status === "playing" ? (
            <Button variant="outline" size="sm" onClick={onPause} className="h-9 bg-white/70 dark:bg-slate-800/70">
              <Pause className="size-4" />
              Pause
            </Button>
          ) : status === "paused" ? (
            <Button
              size="sm"
              onClick={onResume}
              className="h-9 bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/30 hover:from-cyan-600 hover:to-sky-700"
            >
              <Play className="size-4" />
              Resume
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={onStart}
              disabled={startDisabled}
              className="h-9 bg-gradient-to-r from-cyan-500 to-sky-600 text-white shadow-md shadow-cyan-500/30 hover:from-cyan-600 hover:to-sky-700 disabled:from-slate-300 disabled:to-slate-400 disabled:shadow-none"
            >
              {itemsLoading ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
              Start
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={onReset} className="h-9 bg-white/70 dark:bg-slate-800/70">
            <RotateCcw className="size-4" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>
    </section>
  );
}

function OptionRow({ label, icon, children }: { label: string; icon: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}
