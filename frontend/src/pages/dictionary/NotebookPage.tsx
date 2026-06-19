import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    BookMarked, Bookmark, Loader2, Plus, Pencil, Trash2, Check, CloudOff,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import type { NotebookSummary, NotebookResponse } from "@/types";
import { SavedSection, type NoteRef } from "./SavedNotebook";
import { notebooksApi } from "@/api/features/dictionary.api";
import { saveNote } from "./savedStorage";
import { logger } from "@/lib/logger";

// Màu nhãn gợi ý cho sổ tay (lưu hex ở server).
const PRESET_COLORS = ["#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

const NOTEBOOKS_KEY = ["notebooks"] as const;

// ══════════════════════════════════════════════════════════════════════
// Sổ tay — quản lý NHIỀU sổ tay (kiểu Mazii). Chọn một sổ tay để xem các
// từ/kanji đã lưu trong đó; tạo / đổi tên / xóa sổ tay; sửa ghi chú từng mục.
// Dữ liệu lưu trên SERVER theo user (đồng bộ đa thiết bị).
// ══════════════════════════════════════════════════════════════════════
export default function NotebookPage() {
    const navigate = useNavigate();
    const qc = useQueryClient();

    const { data: notebooks = [], isLoading: loadingNotebooks, isError: notebooksError } = useQuery({
        queryKey: NOTEBOOKS_KEY,
        queryFn: notebooksApi.list,
    });

    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Chọn sổ tay mặc định khi danh sách sẵn sàng / khi sổ tay đang chọn biến mất.
    useEffect(() => {
        if (notebooks.length === 0) return;
        if (selectedId === null || !notebooks.some((n) => n.id === selectedId)) {
            const def = notebooks.find((n) => n.isDefault) ?? notebooks[0];
            setSelectedId(def.id);
        }
    }, [notebooks, selectedId]);

    const selected = useMemo(
        () => notebooks.find((n) => n.id === selectedId) ?? null,
        [notebooks, selectedId],
    );

    const { data: entries, isLoading: loadingEntries } = useQuery<NotebookResponse>({
        queryKey: ["notebook-entries", selectedId],
        queryFn: () => notebooksApi.entries(selectedId as number),
        enabled: selectedId !== null,
    });

    const savedWords = entries?.words.map((e) => e.word) ?? [];
    const savedKanjis = entries?.kanjis.map((e) => e.kanji) ?? [];
    const wordNotes = useMemo(() => {
        const m: Record<number, NoteRef> = {};
        for (const e of entries?.words ?? []) m[e.word.id] = { entryId: e.entryId, note: e.note };
        return m;
    }, [entries]);
    const kanjiNotes = useMemo(() => {
        const m: Record<string, NoteRef> = {};
        for (const e of entries?.kanjis ?? []) m[e.kanji.character] = { entryId: e.entryId, note: e.note };
        return m;
    }, [entries]);

    const refreshAll = () => {
        qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY });
        qc.invalidateQueries({ queryKey: ["notebook-entries", selectedId] });
    };

    // ── Dialog: tạo / đổi tên ─────────────────────────────────────────
    const [editor, setEditor] = useState<null | { mode: "create" | "rename"; nb?: NotebookSummary }>(null);
    const [nameDraft, setNameDraft] = useState("");
    const [colorDraft, setColorDraft] = useState<string | undefined>(undefined);
    const [savingNb, setSavingNb] = useState(false);

    const openCreate = () => { setEditor({ mode: "create" }); setNameDraft(""); setColorDraft(undefined); };
    const openRename = (nb: NotebookSummary) => { setEditor({ mode: "rename", nb }); setNameDraft(nb.name); setColorDraft(nb.color); };

    const submitEditor = async () => {
        const name = nameDraft.trim();
        if (!name || !editor) return;
        setSavingNb(true);
        try {
            if (editor.mode === "create") {
                const nb = await notebooksApi.create(name, colorDraft);
                setSelectedId(nb.id);
            } else if (editor.nb) {
                await notebooksApi.update(editor.nb.id, name, colorDraft);
            }
            qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY });
            setEditor(null);
        } catch (e) {
            logger.warn("notebook: lưu sổ tay thất bại", e);
        } finally {
            setSavingNb(false);
        }
    };

    // ── Dialog: xóa sổ tay ────────────────────────────────────────────
    const [deleting, setDeleting] = useState<NotebookSummary | null>(null);
    const [deleteBusy, setDeleteBusy] = useState(false);

    const confirmDelete = async () => {
        if (!deleting) return;
        setDeleteBusy(true);
        try {
            await notebooksApi.remove(deleting.id);
            if (selectedId === deleting.id) setSelectedId(null);
            qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY });
            setDeleting(null);
        } catch (e) {
            logger.warn("notebook: xóa sổ tay thất bại", e);
        } finally {
            setDeleteBusy(false);
        }
    };

    // ── Dialog: sửa ghi chú ───────────────────────────────────────────
    const [editingNote, setEditingNote] = useState<NoteRef | null>(null);
    const [noteDraft, setNoteDraft] = useState("");
    const [noteSaving, setNoteSaving] = useState(false);

    const handleSaveNote = async () => {
        if (!editingNote) return;
        setNoteSaving(true);
        try {
            await saveNote(editingNote.entryId, noteDraft.trim());
            qc.invalidateQueries({ queryKey: ["notebook-entries", selectedId] });
            setEditingNote(null);
        } catch (e) {
            logger.warn("notebook: lưu ghi chú thất bại", e);
        } finally {
            setNoteSaving(false);
        }
    };

    // ── Bỏ một mục khỏi sổ tay đang chọn ──────────────────────────────
    const removeWord = async (wordId: number) => {
        if (selectedId === null) return;
        try { await notebooksApi.removeWord(selectedId, wordId); refreshAll(); }
        catch (e) { logger.warn("notebook: bỏ từ thất bại", e); }
    };
    const removeKanji = async (character: string) => {
        if (selectedId === null) return;
        try { await notebooksApi.removeKanji(selectedId, character); refreshAll(); }
        catch (e) { logger.warn("notebook: bỏ kanji thất bại", e); }
    };

    const goSearch = (term: string, mode: "vocabulary" | "kanji") => {
        const params = new URLSearchParams({ q: term });
        if (mode === "kanji") params.set("mode", "kanji");
        navigate(`/dictionary?${params.toString()}`);
    };

    const totalAll = notebooks.reduce((s, n) => s + n.wordCount + n.kanjiCount, 0);

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
                                {totalAll > 0 && (
                                    <Badge variant="secondary" className="px-1.5 h-5 text-[11px]">{totalAll}</Badge>
                                )}
                                {loadingNotebooks && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                                {notebooksError && (
                                    <Badge variant="outline" className="gap-1 px-1.5 h-5 text-[10px] text-muted-foreground">
                                        <CloudOff className="h-3 w-3" /> Lỗi kết nối
                                    </Badge>
                                )}
                            </h1>
                            <p className="hidden sm:block text-xs text-muted-foreground">
                                Nhiều sổ tay — chọn sổ tay khi lưu từ; đồng bộ theo tài khoản trên mọi thiết bị
                            </p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => navigate("/dictionary")} className="gap-1.5 shrink-0">
                            <Bookmark className="h-3.5 w-3.5" />
                            Tra từ mới
                        </Button>
                    </div>
                </div>

                {/* ── Thanh chọn sổ tay ── */}
                <ScrollArea className="w-full whitespace-nowrap">
                    <div className="flex items-center gap-2 pb-2">
                        {notebooks.map((nb) => {
                            const active = nb.id === selectedId;
                            return (
                                <button
                                    key={nb.id}
                                    onClick={() => setSelectedId(nb.id)}
                                    className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors shrink-0 ${
                                        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-accent/60"
                                    }`}
                                >
                                    {nb.color && (
                                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: nb.color }} />
                                    )}
                                    <span className="truncate max-w-[10rem]">{nb.name}</span>
                                    <span className={`text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                        {nb.wordCount + nb.kanjiCount}
                                    </span>
                                </button>
                            );
                        })}
                        <Button variant="outline" size="sm" onClick={openCreate} className="gap-1.5 shrink-0 rounded-full">
                            <Plus className="h-3.5 w-3.5" /> Sổ tay mới
                        </Button>
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>

                {/* ── Tiêu đề + thao tác cho sổ tay đang chọn ── */}
                {selected && (
                    <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2 min-w-0">
                            {selected.color && (
                                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: selected.color }} />
                            )}
                            <span className="truncate">{selected.name}</span>
                            {selected.isDefault && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 h-4">Mặc định</Badge>
                            )}
                        </p>
                        <div className="ml-auto flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => openRename(selected)}>
                                <Pencil className="h-3.5 w-3.5" /> Đổi tên
                            </Button>
                            {!selected.isDefault && (
                                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-destructive"
                                    onClick={() => setDeleting(selected)}>
                                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Danh sách mục của sổ tay đang chọn ── */}
                {loadingEntries ? (
                    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" /> Đang tải…
                    </div>
                ) : (
                    <SavedSection
                        savedWords={savedWords}
                        savedKanjis={savedKanjis}
                        wordNotes={wordNotes}
                        kanjiNotes={kanjiNotes}
                        onEditNote={(ref) => { setEditingNote(ref); setNoteDraft(ref.note ?? ""); }}
                        onSearchWord={(w) => goSearch(w, "vocabulary")}
                        onSearchKanji={(ch) => goSearch(ch, "kanji")}
                        onRemoveWord={(w) => removeWord(w.id)}
                        onRemoveKanji={(k) => removeKanji(k.character)}
                    />
                )}

                {/* ── Dialog tạo / đổi tên sổ tay ── */}
                <Dialog open={editor !== null} onOpenChange={(o) => { if (!o) setEditor(null); }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>{editor?.mode === "create" ? "Tạo sổ tay mới" : "Đổi tên sổ tay"}</DialogTitle>
                        </DialogHeader>
                        <Input
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitEditor(); } }}
                            placeholder="Tên sổ tay…"
                            maxLength={120}
                            autoFocus
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">Màu:</span>
                            <button
                                type="button"
                                onClick={() => setColorDraft(undefined)}
                                className={`h-6 w-6 rounded-full border flex items-center justify-center ${colorDraft === undefined ? "ring-2 ring-ring" : ""}`}
                                title="Không màu"
                            >{colorDraft === undefined && <Check className="h-3 w-3" />}</button>
                            {PRESET_COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColorDraft(c)}
                                    className={`h-6 w-6 rounded-full ${colorDraft === c ? "ring-2 ring-ring ring-offset-1" : ""}`}
                                    style={{ backgroundColor: c }}
                                    title={c}
                                />
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditor(null)} disabled={savingNb}>Hủy</Button>
                            <Button onClick={submitEditor} disabled={savingNb || !nameDraft.trim()}>
                                {savingNb && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                {editor?.mode === "create" ? "Tạo" : "Lưu"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Dialog xóa sổ tay ── */}
                <Dialog open={deleting !== null} onOpenChange={(o) => { if (!o) setDeleting(null); }}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Xóa sổ tay?</DialogTitle>
                            <DialogDescription>
                                Sổ tay <span className="font-semibold text-foreground">{deleting?.name}</span> cùng{" "}
                                {(deleting?.wordCount ?? 0) + (deleting?.kanjiCount ?? 0)} mục trong đó sẽ bị xóa. Không thể hoàn tác.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteBusy}>Hủy</Button>
                            <Button variant="destructive" onClick={confirmDelete} disabled={deleteBusy}>
                                {deleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Xóa sổ tay
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Dialog sửa ghi chú ── */}
                <Dialog open={editingNote !== null} onOpenChange={(o) => { if (!o) setEditingNote(null); }}>
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
                            <Button variant="outline" onClick={() => setEditingNote(null)} disabled={noteSaving}>Hủy</Button>
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