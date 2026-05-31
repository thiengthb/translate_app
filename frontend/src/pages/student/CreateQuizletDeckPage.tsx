import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { deckApi, deckItemApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { Globe, Loader2, Lock, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import { DeckIconColorPicker, DEFAULT_ICON, DEFAULT_COLOR } from "@/components/common/DeckIconColorPicker";
import type { FlashcardSideDTO } from "@/types";
import { ImportCardsModal } from "@/components/common/ImportCardsModal";
import type { ImportedCard } from "@/components/common/ImportCardsModal";
import { InfoLabel } from "@/components/common/InfoLabel";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  AddCardButton,
  type CardDraft,
  makeCard,
  MAX_CARDS,
  SortableCardList,
} from "./shared/QuizletCardEditor";

/* ─── Concurrency helper (same as Edit page) ─── */
const BATCH_SIZE  = 100;
const CONCURRENCY = 3;

async function pLimit<T>(tasks: Array<() => Promise<T>>, concurrency: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  const worker = async () => {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]!();
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try { return await fn(); }
    catch (err: any) {
      const is429 = err?.response?.status === 429 || err?.status === 429;
      if (is429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

/* ─────────────────────────────────────────
   Create page
───────────────────────────────────────── */
export default function CreateQuizletDeckPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility]   = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [cards, setCards]             = useState<CardDraft[]>([makeCard(), makeCard()]);
  const [saving, setSaving]           = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [deckIcon, setDeckIcon]       = useState<string>(DEFAULT_ICON);
  const [deckColor, setDeckColor]     = useState(DEFAULT_COLOR);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Card helpers ── */
  const addCard = () =>
    setCards((p) => {
      if (p.filter((c) => !c.pendingDelete).length >= MAX_CARDS) {
        toast.error(`Giới hạn tối đa ${MAX_CARDS} thẻ.`);
        return p;
      }
      return [...p, makeCard()];
    });

  const addCardAndScroll = () => {
    addCard();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
  };

  const removeCard    = (uid: string) => setCards((p) => p.map((c) => c.uid === uid ? { ...c, pendingDelete: true } : c));
  const updateCard    = (uid: string, field: "front" | "back", value: string) => setCards((p) => p.map((c) => c.uid === uid ? { ...c, [field]: value } : c));
  const setCardImage  = (uid: string, file: File, preview: string) => setCards((p) => p.map((c) => c.uid === uid ? { ...c, imageFile: file, imagePreview: preview, imageUrl: undefined } : c));
  const clearCardImage = (uid: string) => setCards((p) => p.map((c) => c.uid === uid ? { ...c, imageFile: undefined, imagePreview: undefined, imageUrl: undefined } : c));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCards((items) => {
      const visible  = items.filter((c) => !c.pendingDelete);
      const deleted  = items.filter((c) => c.pendingDelete);
      const oldIdx   = visible.findIndex((c) => c.uid === active.id);
      const newIdx   = visible.findIndex((c) => c.uid === over.id);
      return [...arrayMove(visible, oldIdx, newIdx), ...deleted];
    });
  };

  const handleImport = (imported: ImportedCard[]) => {
    setCards((prev) => {
      const currentVisible = prev.filter((c) => !c.pendingDelete).length;
      const remaining = MAX_CARDS - currentVisible;
      if (remaining <= 0) { toast.error(`Deck đã đạt giới hạn ${MAX_CARDS} thẻ.`); return prev; }
      const toAdd = imported.slice(0, remaining);
      if (toAdd.length < imported.length)
        toast.warning(`Chỉ thêm ${toAdd.length}/${imported.length} thẻ (giới hạn ${MAX_CARDS}).`);
      return [...prev, ...toAdd.map((c) => ({ uid: c.uid, front: c.front, back: c.back }))];
    });
  };

  /* ── Derived ── */
  const [submitted, setSubmitted] = useState(false);
  const visibleCards  = cards.filter((c) => !c.pendingDelete);
  // A "valid" card must have BOTH term and definition filled
  const validCards    = visibleCards.filter((c) => c.front.trim() && c.back.trim());
  const canCreate     = title.trim().length > 0 && validCards.length >= 2;

  const duplicateFronts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleCards.forEach((c) => {
      const key = c.front.trim().toLowerCase();
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    });
    return new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([k]) => k));
  }, [visibleCards]);

  /* ── Save ── */
  const handleSave = async () => {
    setSubmitted(true);
    if (!title.trim()) { toast.error("Hãy nhập tiêu đề deck."); return; }
    // All visible cards must have both term AND definition
    const invalidCards = visibleCards.filter((c) => !c.front.trim() || !c.back.trim());
    if (invalidCards.length > 0) {
      toast.error(`${invalidCards.length} thẻ chưa điền đủ thuật ngữ và định nghĩa.`);
      return;
    }
    if (validCards.length < 2) { toast.error("Cần ít nhất 2 thẻ để tạo deck."); return; }

    setSaving(true);
    try {
      const deck = await deckApi.create({
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        deckIcon,
        deckColor,
        totalCards: validCards.length,
        isActive: true,
      });

      const saveOne = async (card: CardDraft, orderIndex: number) => {
        let imageUrl: string | undefined;
        if (card.imageFile) {
          try {
            const att = await fileApi.upload(card.imageFile, "flashcard", 0, "imageUrl");
            imageUrl = att.url;
          } catch { /* non-fatal */ }
        }

        const sides: FlashcardSideDTO[] = [
          {
            side: "FRONT",
            contents: [
              { contentType: "TEXT", contentValue: card.front.trim() || "(empty)", orderIndex: 0 },
              ...(imageUrl ? [{ contentType: "IMAGE" as const, contentValue: imageUrl, orderIndex: 1 }] : []),
            ],
          },
          {
            side: "BACK",
            contents: [{ contentType: "TEXT", contentValue: card.back.trim() || "(empty)", orderIndex: 0 }],
          },
        ];

        const fc = await withRetry(() => flashcardApi.create({
          cardType: "BASIC", itemType: "WORD", itemId: 0, isActive: true, sides,
        }));
        await withRetry(() => deckItemApi.create({
          deckId: deck.id, flashcardId: fc.id, orderIndex, isActive: true,
        }));
      };

      for (let start = 0; start < validCards.length; start += BATCH_SIZE) {
        const chunk = validCards.slice(start, start + BATCH_SIZE);
        await pLimit(chunk.map((card, j) => () => saveOne(card, start + j)), CONCURRENCY);
      }

      toast.success("Deck đã được tạo!");
      navigate("/library");
    } catch {
      toast.error("Tạo deck thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout pathName={{ "/create-deck/quizlet": "Tạo Quizlet deck" }}>
      <div className="w-full pb-6 space-y-4 pt-1">

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between gap-2">
          {/* Visibility toggle + Icon picker */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisibility((v) => v === "PUBLIC" ? "PRIVATE" : "PUBLIC")}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all",
                visibility === "PUBLIC"
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              {visibility === "PUBLIC"
                ? <><Globe className="size-4" />Công khai</>
                : <><Lock className="size-4" />Riêng tư</>
              }
            </button>
            <DeckIconColorPicker
              icon={deckIcon}
              color={deckColor}
              onChange={(ic, cl) => { setDeckIcon(ic); setDeckColor(cl); }}
              compact
            />
          </div>

          {/* Save buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/create-deck")}
              disabled={saving}
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !canCreate}
              title={!canCreate ? "Cần tiêu đề + ít nhất 2 thẻ đủ nội dung" : undefined}
              className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving
                ? <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />Đang tạo…</span>
                : "Tạo deck"}
            </button>
          </div>
        </div>

        {/* ── Title + Description ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          <div className="px-5 pt-3 pb-4 space-y-1">
            <InfoLabel
              title={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Tiêu đề</span>}
              info="Tên hiển thị của bộ thẻ. Xuất hiện trong thư viện và breadcrumb."
              side="right"
              iconSize={12}
            />
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="Nhập tiêu đề deck…"
              rows={1}
              maxLength={500}
              className="w-full bg-transparent text-foreground font-semibold text-base placeholder:text-muted-foreground/50 focus:outline-none pb-2 border-b-2 border-border focus:border-primary transition-colors resize-none leading-snug"
            />
          </div>
          <div className="px-5 pt-3 pb-4 space-y-1">
            <InfoLabel
              title={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Mô tả</span>}
              info="Mô tả ngắn về nội dung bộ thẻ."
              side="right"
              iconSize={12}
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả để dễ nhận biết bộ thẻ…"
              rows={2}
              maxLength={500}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none pb-0 border-b-2 border-border focus:border-primary transition-colors leading-snug"
            />
          </div>
        </div>

        {/* ── Card count + Add/Import ── */}
        <div className="flex items-center justify-between px-1">
          <InfoLabel
            title={
              <p className="text-sm font-semibold text-foreground">
                Số thẻ: <span className="text-primary">({visibleCards.length})</span>
              </p>
            }
            info="Tổng số thẻ trong deck."
            side="right"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={addCardAndScroll}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              <Plus className="size-3.5" />
              Thêm thẻ
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
            >
              <Upload className="size-3.5" />
              Import
            </button>
          </div>
        </div>

        {/* ── Card list ── */}
        <SortableCardList
          cards={cards}
          onDragEnd={handleDragEnd}
          onChangeFront={(uid, v) => updateCard(uid, "front", v)}
          onChangeBack={(uid, v) => updateCard(uid, "back", v)}
          onImageSelect={setCardImage}
          onImageClear={clearCardImage}
          onDelete={removeCard}
          duplicateFronts={duplicateFronts}
          submitted={submitted}
        />

        {/* ── Bottom add button ── */}
        <AddCardButton onClick={addCard} />
        <div ref={bottomRef} />

        {/* ── Import modal ── */}
        <ImportCardsModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />

        {/* ── Ready count hint ── */}
        {validCards.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            <span className="font-semibold text-foreground">{validCards.length}</span> thẻ đủ nội dung
            {validCards.length < 2 && <span className="text-destructive ml-1">— cần ít nhất 2 thẻ</span>}
          </p>
        )}
      </div>
    </MainLayout>
  );
}
