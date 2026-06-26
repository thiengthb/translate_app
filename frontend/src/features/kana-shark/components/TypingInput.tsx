import { useEffect, useRef } from "react";
import { CornerDownLeft, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { KanaSharkGameStatus, SrsItem } from "../types/kanaShark.types";

interface TypingInputProps {
  value: string;
  status: KanaSharkGameStatus;
  currentTarget: SrsItem | null;
  onValueChange: (value: string) => void;
  onAttempt: (value: string, penalizeMiss?: boolean) => boolean;
}

/**
 * Floating, in-canvas type box. Docked at the bottom-center of the play area so
 * typing is tracked live without a separate input bar stealing screen space.
 * A real <input> is kept (hidden chrome) so IME composition keeps working for
 * kana mode while we render a glassy overlay around it.
 */
export function TypingInput({ value, status, currentTarget, onValueChange, onAttempt }: TypingInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const playing = status === "playing";

  // Keep focus on the type box whenever a round is live so keystrokes are
  // captured immediately — no click required.
  useEffect(() => {
    if (playing) inputRef.current?.focus();
  }, [playing, currentTarget?.flashcardId]);

  // Safety net: if focus drifts (e.g. the user clicked the canvas), pull it back
  // to the type box on the next keystroke so typing never silently stalls.
  useEffect(() => {
    if (!playing) return;
    const refocus = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const input = inputRef.current;
      if (input && document.activeElement !== input) input.focus();
    };
    window.addEventListener("keydown", refocus);
    return () => window.removeEventListener("keydown", refocus);
  }, [playing]);

  if (!playing) return null;

  const handleChange = (nextValue: string) => {
    const matched = onAttempt(nextValue, false);
    onValueChange(matched ? "" : nextValue);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-center bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent px-3 pb-3 pt-10">
      <form
        className="pointer-events-auto w-[min(100%,560px)]"
        onSubmit={(event) => {
          event.preventDefault();
          const matched = onAttempt(value, true);
          if (matched) onValueChange("");
        }}
      >
        <div
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-white/15 bg-slate-900/80 px-4 py-2.5 shadow-2xl shadow-black/40 ring-2 ring-cyan-400/20 backdrop-blur-md transition",
            "focus-within:border-cyan-400/40 focus-within:ring-cyan-400/50",
          )}
          onClick={() => inputRef.current?.focus()}
        >
          <Keyboard className="size-5 shrink-0 text-cyan-400" />
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => handleChange(event.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Gõ cách đọc..."
            className="min-w-0 flex-1 bg-transparent text-lg font-semibold tracking-wide text-white caret-cyan-400 outline-none placeholder:font-normal placeholder:text-slate-400"
          />
          <kbd className="hidden shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-medium text-slate-300 sm:flex">
            <CornerDownLeft className="size-3" />
            Enter
          </kbd>
        </div>
      </form>
    </div>
  );
}
