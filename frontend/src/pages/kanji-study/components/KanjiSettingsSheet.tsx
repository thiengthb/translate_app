import { useEffect } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared chrome for the kanji study option sheets — the bottom-sheet shell and
 * its rows, reused by both Luyện viết ({@link ./KanjiWritingSettingsDialogs})
 * and Trắc nghiệm ({@link ./KanjiQuizSettingsDialogs}) so the two modes look and
 * behave identically. Each dialog supplies its own row grouping (a wrapping
 * `divide-y` container) so a sheet can mix grouped rows with section labels.
 */

/** Advance a value one step around a cycle (wraps at the end). */
export const cycleNext = <T,>(cycle: T[], cur: T): T => cycle[(cycle.indexOf(cur) + 1) % cycle.length];

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="px-5 pt-5 pb-3 text-center text-base font-bold text-foreground">{title}</h3>
        <div className="flex-1 overflow-y-auto">{children}</div>
        <div className="flex justify-end border-t border-border px-5 py-3">
          <button onClick={onClose} className="text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

/** A `divide-y` wrapper for a block of rows. */
export function SheetGroup({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-border/60">{children}</div>;
}

/** Centered section heading ("Limit examples to the following" etc.). */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-5 pt-4 pb-2 text-center text-sm font-bold text-foreground">{children}</p>;
}

export function ToggleRow({
  label,
  desc,
  checked,
  onToggle,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/50">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-foreground">{label}</span>
        {desc && <span className="block text-sm text-muted-foreground">{desc}</span>}
      </span>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 transition-colors",
          checked ? "border-teal-400 bg-teal-400 text-gray-900" : "border-muted-foreground/40"
        )}
      >
        {checked && <Check size={15} strokeWidth={3} />}
      </span>
    </button>
  );
}

export function CycleRow({
  label,
  desc,
  value,
  onCycle,
}: {
  label: string;
  desc?: string;
  value: string;
  onCycle: () => void;
}) {
  return (
    <button type="button" onClick={onCycle} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/50">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-foreground">{label}</span>
        {desc && <span className="block text-sm text-muted-foreground">{desc}</span>}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-foreground">
        {value}
        <ChevronRight size={15} className="text-muted-foreground" />
      </span>
    </button>
  );
}

export function RadioRow({
  label,
  desc,
  selected,
  onSelect,
}: {
  label: string;
  desc?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" onClick={onSelect} className="flex w-full items-center gap-4 px-5 py-3.5 text-left hover:bg-muted/50">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-foreground">{label}</span>
        {desc && <span className="block text-sm text-muted-foreground">{desc}</span>}
      </span>
      <span
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          selected ? "border-teal-400" : "border-muted-foreground/40"
        )}
      >
        {selected && <span className="h-3 w-3 rounded-full bg-teal-400" />}
      </span>
    </button>
  );
}
