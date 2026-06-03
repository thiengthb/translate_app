import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, Bookmark } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WordSearchResult, DictionaryKanjiDetail } from "@/types";
import { SavedSection } from "./SavedNotebook";
import {
    loadSavedWords, loadSavedKanjis, toggleSavedWord, toggleSavedKanji,
    clearAllSaved, reconcileSaved,
} from "./savedStorage";

// ══════════════════════════════════════════════════════════════════════
// Sổ tay — trang riêng hiển thị từ vựng & kanji đã lưu (như cuốn sổ tay).
// Khác trang Từ điển: không có ô tìm kiếm. Click một mục sẽ điều hướng sang
// /dictionary?q=... để tra chi tiết.
// ══════════════════════════════════════════════════════════════════════
export default function NotebookPage() {
    const navigate = useNavigate();
    const [savedWords,  setSavedWords]  = useState<WordSearchResult[]>(loadSavedWords);
    const [savedKanjis, setSavedKanjis] = useState<DictionaryKanjiDetail[]>(loadSavedKanjis);

    // Đối chiếu với server khi mở trang: loại bỏ từ/kanji đã bị xóa.
    useEffect(() => {
        void reconcileSaved().then(({ words, kanjis, wordsChanged, kanjisChanged }) => {
            if (wordsChanged)  setSavedWords(words);
            if (kanjisChanged) setSavedKanjis(kanjis);
        });
    }, []);

    const total = savedWords.length + savedKanjis.length;

    const goSearch = (term: string, mode: "vocabulary" | "kanji") => {
        const params = new URLSearchParams({ q: term });
        if (mode === "kanji") params.set("mode", "kanji");
        navigate(`/dictionary?${params.toString()}`);
    };

    const handleClearAll = () => {
        clearAllSaved();
        setSavedWords([]);
        setSavedKanjis([]);
    };

    return (
        <MainLayout pathName={{ "/notebook": "Sổ tay" }}>
            <div className="w-full space-y-4">

                {/* ── Hero ── */}
                <div className="relative rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-yellow-500/10 via-transparent to-transparent" />
                    <div className="relative p-4 sm:p-5 flex items-center gap-3 flex-wrap">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-500/10 text-yellow-500">
                            <BookMarked className="h-[18px] w-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-base sm:text-lg font-bold leading-tight text-foreground flex items-center gap-2">
                                Sổ tay của tôi
                                {total > 0 && (
                                    <Badge variant="secondary" className="px-1.5 h-5 text-[11px]">{total}</Badge>
                                )}
                            </h1>
                            <p className="hidden sm:block text-xs text-muted-foreground">
                                Từ vựng và kanji bạn đã lưu lại từ trang tra cứu
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate("/dictionary")} className="gap-1.5 shrink-0">
                            <Bookmark className="h-3.5 w-3.5" />
                            Tra từ mới
                        </Button>
                    </div>
                </div>

                {/* ── Danh sách đã lưu ── */}
                <SavedSection
                    savedWords={savedWords}
                    savedKanjis={savedKanjis}
                    onSearchWord={(w) => goSearch(w, "vocabulary")}
                    onSearchKanji={(ch) => goSearch(ch, "kanji")}
                    onRemoveWord={(w) => setSavedWords(toggleSavedWord(w))}
                    onRemoveKanji={(k) => setSavedKanjis(toggleSavedKanji(k))}
                    onClearAll={handleClearAll}
                />
            </div>
        </MainLayout>
    );
}