import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { BrushIcon, ChevronRight, History, ListChecks } from "lucide-react";
import { kanjiStudyApi } from "@/api/features/kanji_study";
import type { KanjiRecentSession } from "@/types/features/kanji_study";

/** Latest sessions shown inline on the dashboard; the rest live on the full page. */
const MAX_PREVIEW = 3;

/**
 * "Phiên gần đây" — the saved study sessions surfaced on the Kanji dashboard
 * (the mobile app's "Saved session will appear on the home screen"). Tapping a
 * row jumps straight back into that deck/group with the same mode.
 *
 * Renders nothing when the user has no saved sessions yet (or the backend
 * endpoint isn't available), so it never clutters a fresh dashboard.
 */

const MODE_LABEL: Record<string, string> = {
  QUIZ: "Trắc nghiệm",
  FLASHCARD: "Flashcard",
  WRITING: "Luyện viết",
  READING: "Đọc",
};

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

export function KanjiRecentSessions() {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["kanji-recent-sessions"],
    queryFn: () => kanjiStudyApi.recent(6),
  });

  const sessions = data ?? [];
  if (sessions.length === 0) return null;

  const go = (s: KanjiRecentSession) => {
    if (!s.deckId) return;
    const path = s.mode === "FLASHCARD" ? "flashcard" : s.mode === "WRITING" ? "writing" : "quiz";
    const group = s.groupIndex != null ? `?group=${s.groupIndex}` : "";
    navigate(`/kanji-study/deck/${s.deckId}/${path}${group}`);
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <button
        onClick={() => navigate("/kanji-study/sessions")}
        className="mb-3 flex w-full items-center gap-2 text-sm font-semibold text-foreground"
        title="Xem tất cả phiên học"
      >
        <History size={16} className="text-rose-500" /> Phiên gần đây
        <ChevronRight size={16} className="ml-auto text-muted-foreground" />
      </button>
      <div className="flex flex-col divide-y divide-border/60">
        {sessions.slice(0, MAX_PREVIEW).map((s) => (
          <button
            key={s.sessionId}
            onClick={() => go(s)}
            className="flex items-center gap-3 py-2.5 px-2 -mx-2 text-left rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="grid place-items-center h-9 w-9 rounded-lg bg-muted text-muted-foreground shrink-0">
              {s.mode === "FLASHCARD" ? <BrushIcon size={16} /> : <ListChecks size={16} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground truncate">
                {s.deckTitle ?? "Deck"}
                {s.groupIndex != null ? ` · Nhóm ${s.groupIndex + 1}` : ""}
              </span>
              <span className="block text-xs text-muted-foreground">
                {MODE_LABEL[s.mode] ?? s.mode}
                {whenLabel(s.endedAt) ? ` · ${whenLabel(s.endedAt)}` : ""}
              </span>
            </span>
            {s.mode !== "FLASHCARD" && s.totalItems > 0 && (
              <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">{s.accuracy}%</span>
            )}
            <ChevronRight size={16} className="text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
      {sessions.length > MAX_PREVIEW && (
        <button
          onClick={() => navigate("/kanji-study/sessions")}
          className="mt-2 w-full rounded-lg py-2 text-center text-sm font-medium text-rose-500 hover:bg-muted/50"
        >
          Xem tất cả ({sessions.length})
        </button>
      )}
    </section>
  );
}
