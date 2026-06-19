import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BrushIcon, ChevronRight, History, ListChecks } from "lucide-react";
import { kanjiStudyApi } from "@/api/features/kanji_study";
import type { KanjiRecentSession } from "@/types/features/kanji_study";
import { KanjiLayout } from "./components/KanjiLayout";

/**
 * Full study-session history — the "see all" target of the dashboard's
 * "Phiên gần đây" card (which now shows only the latest few). Same row layout,
 * just the complete list.
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

export default function KanjiSessionsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["kanji-recent-sessions", "all"],
    queryFn: () => kanjiStudyApi.recent(100),
  });
  const sessions = data ?? [];

  const go = (s: KanjiRecentSession) => {
    if (!s.deckId) return;
    const path = s.mode === "FLASHCARD" ? "flashcard" : s.mode === "WRITING" ? "writing" : "quiz";
    const group = s.groupIndex != null ? `?group=${s.groupIndex}` : "";
    navigate(`/kanji-study/deck/${s.deckId}/${path}${group}`);
  };

  return (
    <KanjiLayout>
      <div className="mx-auto w-full max-w-2xl pb-10">
        <button
          onClick={() => navigate("/kanji-study")}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Trang chủ
        </button>

        <h1 className="mb-1 flex items-center gap-2 text-2xl font-bold text-foreground">
          <History size={22} className="text-rose-500" /> Phiên gần đây
        </h1>
        <p className="mb-5 text-muted-foreground">Toàn bộ lịch sử học của bạn</p>

        {isLoading ? (
          <p className="text-muted-foreground">Đang tải...</p>
        ) : sessions.length === 0 ? (
          <p className="text-muted-foreground">Chưa có phiên học nào.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60 rounded-2xl border border-border bg-card">
            {sessions.map((s) => (
              <button
                key={s.sessionId}
                onClick={() => go(s)}
                className="flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  {s.mode === "WRITING" ? <BrushIcon size={16} /> : <ListChecks size={16} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {s.deckTitle ?? "Deck"}
                    {s.groupIndex != null ? ` · Nhóm ${s.groupIndex + 1}` : ""}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {MODE_LABEL[s.mode] ?? s.mode}
                    {whenLabel(s.endedAt) ? ` · ${whenLabel(s.endedAt)}` : ""}
                  </span>
                </span>
                {s.mode !== "FLASHCARD" && s.totalItems > 0 && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{s.accuracy}%</span>
                )}
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    </KanjiLayout>
  );
}
