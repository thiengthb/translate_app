import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Bookmark, BookmarkCheck, Check, Plus, Loader2, FolderPlus,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notebooksApi } from "@/api/features/dictionary.api";
import type { NotebookSummary } from "@/types";
import { logger } from "@/lib/logger";

// Đích để lưu — một từ vựng (theo id) hoặc một kanji (theo ký tự).
export type PickerTarget =
    | { kind: "word"; wordId: number }
    | { kind: "kanji"; character: string };

const NOTEBOOKS_KEY = ["notebooks"] as const;

// Chấm màu nhãn sổ tay (color là token tailwind lưu ở server, fallback primary).
function ColorDot({ color }: { color?: string }) {
    return (
        <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={color ? { backgroundColor: color } : undefined}
            data-default={!color}
        />
    );
}

/**
 * Nút "lưu" kiểu Mazii: bấm để mở popover chọn sổ tay. Một từ/kanji có thể
 * nằm trong nhiều sổ tay (tích nhiều ô); có thể tạo sổ tay mới ngay tại đây.
 * Icon hiển thị trạng thái đã-lưu-ở-bất-kỳ-sổ-tay-nào (savedAnywhere).
 */
export function NotebookPicker({ target, savedAnywhere, onSavedChange }: {
    target: PickerTarget;
    savedAnywhere: boolean;
    /** Báo cho parent biết item còn được lưu ở ≥1 sổ tay hay không (cho fill bookmark + cache). */
    onSavedChange: (savedAnywhere: boolean) => void;
}) {
    const [open, setOpen] = useState(false);
    const qc = useQueryClient();

    const targetKey = target.kind === "word" ? `w${target.wordId}` : `k${target.character}`;

    // Danh sách sổ tay — chỉ tải khi mở (chia sẻ cache giữa mọi picker).
    const { data: notebooks = [], isLoading: loadingNotebooks } = useQuery({
        queryKey: NOTEBOOKS_KEY,
        queryFn: notebooksApi.list,
        enabled: open,
        staleTime: 30_000,
    });

    // Sổ tay đang chứa item này.
    const { data: membership } = useQuery({
        queryKey: ["notebook-membership", targetKey],
        queryFn: () => target.kind === "word"
            ? notebooksApi.wordMembership(target.wordId)
            : notebooksApi.kanjiMembership(target.character),
        enabled: open,
        // Không refetch khi focus lại cửa sổ — tránh ghi đè toggle optimistic đang bay.
        refetchOnWindowFocus: false,
    });

    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [busy, setBusy] = useState<Set<number>>(new Set());
    const [newName, setNewName] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => { if (membership) setSelected(new Set(membership)); }, [membership]);

    const setBusyFlag = (id: number, on: boolean) =>
        setBusy((b) => { const n = new Set(b); if (on) n.add(id); else n.delete(id); return n; });

    const toggle = async (nb: NotebookSummary) => {
        const has = selected.has(nb.id);
        const prev = selected;
        const next = new Set(prev);
        if (has) next.delete(nb.id); else next.add(nb.id);
        setSelected(next);
        onSavedChange(next.size > 0);
        setBusyFlag(nb.id, true);
        try {
            if (target.kind === "word") {
                has ? await notebooksApi.removeWord(nb.id, target.wordId)
                    : await notebooksApi.addWord(nb.id, target.wordId);
            } else {
                has ? await notebooksApi.removeKanji(nb.id, target.character)
                    : await notebooksApi.addKanji(nb.id, target.character);
            }
            qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY });
            qc.invalidateQueries({ queryKey: ["notebook-entries"] });
        } catch (e) {
            logger.warn("notebook picker: toggle thất bại, hoàn tác", e);
            setSelected(prev);
            onSavedChange(prev.size > 0);
        } finally {
            setBusyFlag(nb.id, false);
        }
    };

    const createAndAdd = async () => {
        const name = newName.trim();
        if (!name || creating) return;
        setCreating(true);
        try {
            const nb = await notebooksApi.create(name);
            if (target.kind === "word") await notebooksApi.addWord(nb.id, target.wordId);
            else await notebooksApi.addKanji(nb.id, target.character);
            setNewName("");
            setSelected((s) => new Set(s).add(nb.id));
            onSavedChange(true);
            qc.invalidateQueries({ queryKey: NOTEBOOKS_KEY });
            qc.invalidateQueries({ queryKey: ["notebook-entries"] });
        } catch (e) {
            logger.warn("notebook picker: tạo sổ tay thất bại", e);
        } finally {
            setCreating(false);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    size="icon-sm"
                    variant="ghost"
                    title={savedAnywhere ? "Đã lưu — quản lý sổ tay" : "Lưu vào sổ tay"}
                    className={savedAnywhere ? "text-yellow-500 hover:text-yellow-600" : ""}
                >
                    {savedAnywhere ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-0">
                <div className="px-3 py-2.5 border-b">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Bookmark className="h-3.5 w-3.5 text-yellow-500" />
                        Lưu vào sổ tay
                    </p>
                </div>

                <ScrollArea className="max-h-56">
                    <div className="py-1">
                        {loadingNotebooks && notebooks.length === 0 ? (
                            <div className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải sổ tay…
                            </div>
                        ) : notebooks.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
                                Chưa có sổ tay — tạo một cái bên dưới.
                            </div>
                        ) : (
                            notebooks.map((nb) => {
                                const checked = selected.has(nb.id);
                                const isBusy = busy.has(nb.id);
                                return (
                                    <button
                                        key={nb.id}
                                        type="button"
                                        onClick={() => toggle(nb)}
                                        disabled={isBusy}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-accent/60 transition-colors disabled:opacity-60"
                                    >
                                        <span className={`h-4 w-4 shrink-0 rounded border flex items-center justify-center transition-colors ${
                                            checked ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
                                        }`}>
                                            {isBusy ? <Loader2 className="h-3 w-3 animate-spin" />
                                                : checked ? <Check className="h-3 w-3" /> : null}
                                        </span>
                                        <ColorDot color={nb.color} />
                                        <span className="flex-1 min-w-0 text-sm text-foreground truncate">{nb.name}</span>
                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                            {nb.wordCount + nb.kanjiCount}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                <div className="flex items-center gap-1.5 p-2 border-t">
                    <FolderPlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); createAndAdd(); } }}
                        placeholder="Sổ tay mới…"
                        maxLength={120}
                        className="h-7 text-xs px-2"
                    />
                    <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={createAndAdd}
                        disabled={!newName.trim() || creating}
                        title="Tạo & lưu vào sổ tay mới"
                    >
                        {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}