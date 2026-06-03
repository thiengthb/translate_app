import { Bookmark, BookmarkCheck, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { WordSearchResult, DictionaryKanjiDetail } from "@/types";
import { JLPT } from "./dictionaryConstants";

// ══════════════════════════════════════════════════════════════════════
// Saved section — danh sách từ vựng & kanji đã lưu (dùng ở trang Sổ tay).
// Hiển thị dạng "thẻ bài" (flashcard) chữ to, khác kiểu danh sách của trang
// tra từ — để học/ôn nhìn cho rõ.
// ══════════════════════════════════════════════════════════════════════
export function SavedSection({
    savedWords, savedKanjis, onSearchWord, onSearchKanji, onRemoveWord, onRemoveKanji, onClearAll,
}: {
    savedWords: WordSearchResult[];
    savedKanjis: DictionaryKanjiDetail[];
    onSearchWord: (w: string) => void;
    onSearchKanji: (ch: string) => void;
    onRemoveWord: (w: WordSearchResult) => void;
    onRemoveKanji: (k: DictionaryKanjiDetail) => void;
    onClearAll: () => void;
}) {
    if (savedWords.length === 0 && savedKanjis.length === 0) {
        return (
            <EmptyState
                className="py-12"
                icon={<Bookmark className="size-7" />}
                title="Sổ tay của bạn còn trống"
                description={
                    <>
                        Vào trang <span className="font-medium">Từ điển</span>, nhấn nút{" "}
                        <Bookmark className="inline h-3 w-3 mx-0.5 align-middle" /> trên kết quả tra để lưu từ/kanji vào sổ tay
                    </>
                }
            />
        );
    }

    return (
        <div className="space-y-3">
            {savedWords.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Từ vựng đã lưu</p>
                        <span className="ml-auto text-xs text-muted-foreground">{savedWords.length} từ</span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-3">
                        {savedWords.map((w) => (
                            <SavedWordCard key={w.id} word={w} onSearch={onSearchWord} onRemove={() => onRemoveWord(w)} />
                        ))}
                    </div>
                </Card>
            )}

            {savedKanjis.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kanji đã lưu</p>
                        <span className="ml-auto text-xs text-muted-foreground">{savedKanjis.length} kanji</span>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-3 p-3">
                        {savedKanjis.map((k) => (
                            <SavedKanjiCard key={k.character} kanji={k} onSearch={onSearchKanji} onRemove={() => onRemoveKanji(k)} />
                        ))}
                    </div>
                </Card>
            )}

            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="text-muted-foreground hover:text-destructive gap-1.5"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa tất cả đã lưu
                </Button>
            </div>
        </div>
    );
}

// ── Thẻ bài từ vựng ───────────────────────────────────────────────────
function SavedWordCard({ word, onSearch, onRemove }: {
    word: WordSearchResult; onSearch: (w: string) => void; onRemove: () => void;
}) {
    const jlpt = JLPT[word.levelCode ?? ""];
    return (
        <div className="relative group">
            <button
                onClick={() => onSearch(word.word)}
                className="w-full h-full flex flex-col items-center justify-center text-center gap-1.5 rounded-xl border bg-card px-3 pt-7 pb-4 min-h-[9rem] transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
            >
                {jlpt && (
                    <Badge variant="outline" className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0 h-4 ${jlpt.badge}`}>
                        {word.levelCode}
                    </Badge>
                )}
                <span className={`text-3xl sm:text-4xl font-bold leading-none tracking-tight ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                    {word.word}
                </span>
                {word.reading && word.reading !== word.word && (
                    <span className="text-sm text-muted-foreground leading-tight">【{word.reading}】</span>
                )}
                {word.meaningText && (
                    <span className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-0.5">{word.meaningText}</span>
                )}
            </button>
            <button
                onClick={onRemove}
                title="Bỏ lưu"
                className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-destructive/15 text-destructive opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-destructive/25"
            ><X className="h-3 w-3" /></button>
        </div>
    );
}

// ── Thẻ bài kanji ─────────────────────────────────────────────────────
function SavedKanjiCard({ kanji, onSearch, onRemove }: {
    kanji: DictionaryKanjiDetail; onSearch: (ch: string) => void; onRemove: () => void;
}) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    return (
        <div className="relative group">
            <button
                onClick={() => onSearch(kanji.character)}
                className="w-full h-full flex flex-col items-center justify-center text-center gap-1 rounded-xl border bg-card px-2 pt-6 pb-3 min-h-[8rem] transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
            >
                {jlpt && (
                    <Badge variant="outline" className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0 h-4 ${jlpt.badge}`}>
                        {kanji.jlptLevel}
                    </Badge>
                )}
                <span className={`text-5xl sm:text-6xl font-bold leading-none ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                    {kanji.character}
                </span>
                {kanji.meaning && (
                    <span className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-1.5">{kanji.meaning}</span>
                )}
            </button>
            <button
                onClick={onRemove}
                title="Bỏ lưu"
                className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded-full bg-destructive/15 text-destructive opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-destructive/25"
            ><X className="h-3 w-3" /></button>
        </div>
    );
}