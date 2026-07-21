import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult } from "@/types";
import { WordCard } from "./DictionaryPage";
import { loadSavedWords, markWordSaved, fetchNotebook } from "./savedStorage";

// Tùy chọn hiển thị furigana — đồng bộ với DictionaryPage (mặc định bật).
function loadFuriganaPref(): boolean {
    try { return localStorage.getItem("dict_furigana") !== "0"; }
    catch { return true; }
}

// Trang chi tiết một từ vựng (/words/:wordId). Ghép sẵn nghĩa đa ngôn ngữ,
// hán tự cấu thành, ví dụ trong DB + ví dụ thực tế (Tatoeba) và phát âm —
// tái dùng WordCard để đồng nhất giao diện với kết quả tìm kiếm.
export default function WordDetailPage() {
    const { wordId } = useParams<{ wordId: string }>();
    const navigate = useNavigate();
    const id = Number(wordId);

    const { data: word, isLoading, isError } = useQuery<WordSearchResult>({
        queryKey: ["dictionary-word", id],
        queryFn: () => dictionaryApi.getWord(id),
        enabled: Number.isFinite(id) && id > 0,
    });

    // Sổ tay: cache localStorage để render tức thì, đồng bộ bản chuẩn từ server.
    const [savedIds, setSavedIds] = useState<Set<number>>(
        () => new Set(loadSavedWords().map((w) => w.id)),
    );
    useEffect(() => {
        let cancelled = false;
        fetchNotebook()
            .then(({ words }) => { if (!cancelled) setSavedIds(new Set(words.map((w) => w.id))); })
            .catch(() => { /* offline — giữ cache localStorage */ });
        return () => { cancelled = true; };
    }, []);

    const handleSavedChange = useCallback((w: WordSearchResult, saved: boolean) => {
        setSavedIds(new Set(markWordSaved(w, saved).map((x) => x.id)));
    }, []);

    // Click hán tự trong từ → mở từ điển ở chế độ tra kanji.
    const handleKanjiSearch = useCallback((ch: string) => {
        if (ch) navigate(`/dictionary?q=${encodeURIComponent(ch)}&mode=kanji`);
    }, [navigate]);

    return (
        <MainLayout pageScroll>
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
                <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                    <Link to="/dictionary"><ArrowLeft className="h-4 w-4" />Từ điển</Link>
                </Button>

                {isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Đang tải...
                    </div>
                ) : isError || !word ? (
                    <EmptyState
                        className="py-10"
                        icon={<AlertCircle className="size-7" />}
                        title="Không tìm thấy từ"
                        description="Từ vựng này không tồn tại hoặc đã bị xóa."
                    />
                ) : (
                    <WordCard
                        word={word}
                        onSearch={handleKanjiSearch}
                        furigana={loadFuriganaPref()}
                        savedIds={savedIds}
                        onSavedChange={handleSavedChange}
                    />
                )}
            </div>
        </MainLayout>
    );
}