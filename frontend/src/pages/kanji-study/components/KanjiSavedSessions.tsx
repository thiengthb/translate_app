import { useNavigate } from "react-router-dom";
import { BrushIcon, ListChecks, Play, X } from "lucide-react";
import { clearSession, useSavedSessions, type SavedSession } from "../lib/kanjiSession";

/**
 * "Học tiếp" — resumable study sessions the learner saved with "Lưu để học
 * tiếp" (the app's "Saved session will appear on the home screen"). Tapping a
 * row reopens that deck/group in the same mode, where the page offers to resume
 * from the saved spot. Reads the client-side store, so it updates live as
 * sessions are saved or finished; renders nothing when there are none.
 */

function whenLabel(iso?: string | null): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hôm qua";
  if (days < 30) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export function KanjiSavedSessions() {
  const navigate = useNavigate();
  const sessions = useSavedSessions();
  if (sessions.length === 0) return null;

  const go = (s: SavedSession) => {
    const path = s.mode === "QUIZ" ? "quiz" : "writing";
    const group = s.groupIndex != null ? `?group=${s.groupIndex}` : "";
    navigate(`/kanji-study/deck/${s.deckId}/${path}${group}`);
  };

  return (
    <section className="rounded-2xl border border-chart-2/50 bg-chart-2/10 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Play size={16} className="text-[color:var(--sk-mint-deep)]" /> Học tiếp
      </h2>
      <div className="flex flex-col divide-y divide-border/60">
        {sessions.map((s) => (
          <div key={`${s.mode}:${s.deckId}:${s.groupIndex ?? "all"}`} className="flex items-center gap-3 py-2.5">
            <button onClick={() => go(s)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-chart-2/15 text-[color:var(--sk-mint-deep)]">
                {s.mode === "QUIZ" ? <ListChecks size={16} /> : <BrushIcon size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-foreground">
                  {s.deckTitle ?? "Deck"}
                  {s.groupLabel ? ` · ${s.groupLabel}` : s.groupIndex != null ? ` · Nhóm ${s.groupIndex + 1}` : ""}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.mode === "QUIZ" ? "Trắc nghiệm" : "Luyện viết"} · {s.index}/{s.total}
                  {whenLabel(s.savedAt) ? ` · ${whenLabel(s.savedAt)}` : ""}
                </span>
              </span>
            </button>
            <button
              onClick={() => clearSession(s.mode, s.deckId, s.groupIndex)}
              className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground"
              title="Xóa phiên đã lưu"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
