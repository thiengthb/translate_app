import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { loadSession, type SavedSessionMode } from "../lib/kanjiSession";

/**
 * The "HỌC" study-mode picker (mirrors the mobile Kanji Study app): tapping a
 * group's HỌC button opens this sheet to choose how to study that batch.
 *
 * Modes with a resumable saved session show "Tiếp tục từ …" so the learner can
 * pick up where they left off (the page reloads the saved state).
 */

export type KanjiStudyMode = "flashcard" | "quiz" | "writing" | "reading";

const SAVED_MODE: Partial<Record<KanjiStudyMode, SavedSessionMode>> = { quiz: "QUIZ", writing: "WRITING" };

function resumeLabel(savedAt: string): string {
  try {
    return `Tiếp tục từ ${new Date(savedAt).toLocaleString("vi-VN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "Tiếp tục phiên đã lưu";
  }
}

interface ModeOption {
  key: KanjiStudyMode;
  label: string;
  desc: string;
  dot: string;
  ready: boolean;
}

const MODES: ModeOption[] = [
  { key: "flashcard", label: "Học bằng Flashcard", desc: "Học bằng cách học thuộc lòng", dot: "bg-emerald-500", ready: true },
  { key: "quiz", label: "Trắc nghiệm", desc: "Kiểm tra nhanh kiến thức", dot: "bg-sky-500", ready: true },
  { key: "writing", label: "Luyện viết", desc: "Tự phát hiện nét vẽ và tự kiểm tra", dot: "bg-indigo-500", ready: true },
  { key: "reading", label: "Học theo cách đọc (100%)", desc: "Read kanji-graded exercises", dot: "bg-slate-500", ready: false },
];

export function KanjiStudyOptionsDialog({
  title,
  deckId,
  groupIndex,
  onSelect,
  onClose,
}: {
  title: string;
  deckId?: number | string | null;
  groupIndex?: number | null;
  onSelect: (mode: KanjiStudyMode) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border border-border bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="px-5 pt-5 pb-3 text-lg font-bold text-foreground">{title}</h3>
        <div className="pb-2">
          {MODES.map((m) => {
            const savedMode = SAVED_MODE[m.key];
            const saved =
              savedMode && deckId != null ? loadSession(savedMode, deckId, groupIndex ?? null) : null;
            return (
              <button
                key={m.key}
                type="button"
                disabled={!m.ready}
                onClick={() => m.ready && onSelect(m.key)}
                className={cn(
                  "w-full flex items-center gap-4 px-5 py-3.5 text-left transition-colors",
                  m.ready ? "hover:bg-muted/70 cursor-pointer" : "opacity-50 cursor-not-allowed"
                )}
              >
                <span className={cn("shrink-0 h-6 w-6 rounded-full ring-4 ring-inset ring-card", m.dot)} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="text-[15px] font-medium text-foreground">{m.label}</span>
                    {!m.ready && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Sắp ra mắt
                      </span>
                    )}
                  </span>
                  <span className="block text-sm text-muted-foreground">{m.desc}</span>
                  {saved && (
                    <span className="block text-sm font-medium text-teal-600 dark:text-teal-400">
                      {resumeLabel(saved.savedAt)}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
