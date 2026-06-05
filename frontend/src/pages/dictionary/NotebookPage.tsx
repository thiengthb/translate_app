import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookMarked, Bookmark, CloudOff, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { WordSearchResult, DictionaryKanjiDetail, NotebookResponse } from "@/types";
import { SavedSection, type NoteRef } from "./SavedNotebook";
import {
    loadSavedWords, loadSavedKanjis, toggleSavedWord, toggleSavedKanji,
    clearAllSaved, fetchNotebook, saveNote,
} from "./savedStorage";

// ══════════════════════════════════════════════════════════════════════
// Sổ tay — trang riêng hiển thị từ vựng & kanji đã lưu (như cuốn sổ tay).
// Dữ liệu lưu trên SERVER theo user (sync đa thiết bị); localStorage chỉ là
// cache để render tức thì + fallback khi offline. Click một mục sẽ điều hướng
// sang /dictionary?q=... để tra chi tiết.
// ══════════════════════════════════════════════════════════════════════
export default function NotebookPage() {
    const navigate = useNavigate();
    // Init từ cache để render ngay; server data ghi đè khi fetch xong.
    const [savedWords,  setSavedWords]  = useState<WordSearchResult[]>(loadSavedWords);
    const [savedKanjis, setSavedKanjis] = useState<DictionaryKanjiDetail[]>(loadSavedKanjis);
    const [wordNotes,   setWordNotes]   = useState<Record<number, NoteRef>>({});
    const [kanjiNotes,  setKanjiNotes]  = useState<Record<string, NoteRef>>({});
    const [syncing, setSyncing] = useState(true);
    const [offline, setOffline] = useState(false);

    // Dialog sửa ghi chú
    const [editingNote, setEditingNote] = useState<NoteRef | null>(null);
    const [noteDraft,   setNoteDraft]   = useState("");
    const [noteSaving,  setNoteSaving]  = useState(false);

    const applyServerData = (raw: NotebookResponse) => {
        setSavedWords(raw.words.map((e) => e.word));
        setSavedKanjis(raw.kanjis.map((e) => e.kanji));
        const wn: Record<number, NoteRef> = {};
        for (const e of raw.words) wn[e.word.id] = { entryId: e.entryId, note: e.note };
        const kn: Record<string, NoteRef> = {};
        for (const e of raw.kanjis) kn[e.kanji.character] = { entryId: e.entryId, note: e.note };
        setWordNotes(wn);
        setKanjiNotes(kn);
    };

    // Lấy bản chuẩn từ server (lần đầu tự merge cache cũ lên server).
    // Lỗi mạng → giữ cache, hiện badge offline.
    useEffect(() => {
        fetchNotebook()
            .then(({ raw }) => { applyServerData(raw); setOffline(false); })
            .catch(() => setOffline(true))
            .finally(() => setSyncing(false));
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
        setWordNotes({});
        setKanjiNotes({});
    };

    const openNoteEditor = (ref: NoteRef) => {
        setEditingNote(ref);
        setNoteDraft(ref.note ?? "");
    };

    const handleSaveNote = async () => {
        if (!editingNote) return;
        setNoteSaving(true);
        try {
            await saveNote(editingNote.entryId, noteDraft.trim());
            const updated: NoteRef = { entryId: editingNote.entryId, note: noteDraft.trim() || undefined };
            setWordNotes((m) => {
                const next = { ...m };
                for (const k of Object.keys(next)) {
                    if (next[Number(k)].entryId === updated.entryId) next[Number(k)] = updated;
                }
                return next;
            });
            setKanjiNotes((m) => {
                const next = { ...m };
                for (const k of Object.keys(next)) {
                    if (next[k].entryId === updated.entryId) next[k] = updated;
                }
                return next;
            });
            setEditingNote(null);
        } catch { /* giữ dialog mở để user thử lại */ }
        finally { setNoteSaving(false); }
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
                                {syncing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                {offline && (
                                    <Badge variant="outline" className="gap-1 px-1.5 h-5 text-[10px] text-muted-foreground" title="Không kết nối được server — đang hiển thị bản lưu trên máy">
                                        <CloudOff className="h-3 w-3" />
                                        Offline
                                    </Badge>
                                )}
                            </h1>
                            <p className="hidden sm:block text-xs text-muted-foreground">
                                Từ vựng và kanji bạn đã lưu — đồng bộ theo tài khoản trên mọi thiết bị
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
                    wordNotes={wordNotes}
                    kanjiNotes={kanjiNotes}
                    onEditNote={openNoteEditor}
                    onSearchWord={(w) => goSearch(w, "vocabulary")}
                    onSearchKanji={(ch) => goSearch(ch, "kanji")}
                    onRemoveWord={(w) => {
                        setSavedWords(toggleSavedWord(w));
                        setWordNotes((m) => { const n = { ...m }; delete n[w.id]; return n; });
                    }}
                    onRemoveKanji={(k) => {
                        setSavedKanjis(toggleSavedKanji(k));
                        setKanjiNotes((m) => { const n = { ...m }; delete n[k.character]; return n; });
                    }}
                    onClearAll={handleClearAll}
                />

                {/* ── Dialog sửa ghi chú ── */}
                <Dialog open={editingNote !== null} onOpenChange={(open) => { if (!open) setEditingNote(null); }}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Ghi chú cá nhân</DialogTitle>
                        </DialogHeader>
                        <Textarea
                            value={noteDraft}
                            onChange={(e) => setNoteDraft(e.target.value)}
                            placeholder="Mẹo nhớ, ngữ cảnh, câu ví dụ của riêng bạn…"
                            maxLength={2000}
                            rows={4}
                            autoFocus
                        />
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingNote(null)} disabled={noteSaving}>
                                Hủy
                            </Button>
                            <Button onClick={handleSaveNote} disabled={noteSaving}>
                                {noteSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Lưu ghi chú
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </MainLayout>
    );
}