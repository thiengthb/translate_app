import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deckApi, deckItemApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { Globe, Lock, Loader2, Plus, Upload } from "lucide-react";
import { InfoLabel } from "@/components/common/InfoLabel";
import { DeckIconColorPicker, DEFAULT_ICON, DEFAULT_COLOR } from "@/components/common/DeckIconColorPicker";
import { toast } from "sonner";
import type { FlashcardSideDTO, DeckDTO } from "@/types";
import { ImportCardsModal } from "@/components/common/ImportCardsModal";
import type { ImportedCard } from "@/components/common/ImportCardsModal";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  AddCardButton,
  type CardDraft,
  makeCard,
  MAX_CARDS,
  SortableCardList,
} from "./shared/QuizletCardEditor";

function getTextContent(sides: FlashcardSideDTO[] | undefined, side: "FRONT" | "BACK"): string {
  const found = sides?.find((s) => s.side === side);
  return (
    found?.contents?.find((c) => c.contentType === "TEXT")?.contentValue ?? ""
  );
}

function getImageContent(sides: FlashcardSideDTO[] | undefined): string | undefined {
  const front = sides?.find((s) => s.side === "FRONT");
  return front?.contents?.find((c) => c.contentType === "IMAGE")?.contentValue;
}

/* ─────────────────────────────────────────
   Edit page
───────────────────────────────────────── */
const BATCH_SIZE  = 100; // cards per logical chunk — each chunk is saved before the next
const CONCURRENCY = 3;   // max simultaneous saveOne operations inside a chunk

/**
 * Run tasks with a concurrency cap — at most `concurrency` tasks in-flight.
 * Workers pick the next pending task as soon as they finish, so throughput
 * stays high without overwhelming the backend with burst traffic.
 */
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

/** Retry a task up to `retries` times with exponential back-off on 429. */
async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 = err?.response?.status === 429 || err?.status === 429;
      if (is429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, 400 * 2 ** attempt)); // 400ms, 800ms, 1600ms
        continue;
      }
      throw err;
    }
  }
  throw new Error("unreachable");
}

/* Snapshot shape for change detection */
interface InitialState {
  title: string;
  description: string;
  visibility: string;
  deckIcon: string;
  deckColor: string;
  cards: { uid: string; flashcardId?: number; front: string; back: string; imageUrl?: string }[];
}

export default function EditQuizletDeckPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();

  const [deck, setDeck] = useState<DeckDTO | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [deckIcon, setDeckIcon]   = useState<string>(DEFAULT_ICON);
  const [deckColor, setDeckColor] = useState(DEFAULT_COLOR);
  const [cards, setCards] = useState<CardDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const initialStateRef = useRef<InitialState | null>(null);

  /* ── Import with 1000-card cap ── */
  const handleImport = (imported: ImportedCard[]) => {
    setCards((prev) => {
      const currentVisible = prev.filter((c) => !c.pendingDelete).length;
      const remaining = MAX_CARDS - currentVisible;
      if (remaining <= 0) {
        toast.error(`Deck đã đạt giới hạn ${MAX_CARDS} thẻ.`);
        return prev;
      }
      const toAdd = imported.slice(0, remaining);
      if (toAdd.length < imported.length)
        toast.warning(`Chỉ thêm ${toAdd.length}/${imported.length} thẻ (giới hạn ${MAX_CARDS}).`);
      return [...prev, ...toAdd.map((c) => ({ uid: c.uid, front: c.front, back: c.back }))];
    });
  };

  /* Thêm thẻ với giới hạn + cuộn xuống cuối */
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
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 80);
  };

  /* ── Load deck + cards ── */
  useEffect(() => {
    if (!deckId) return;
    setLoading(true);

    Promise.all([
      deckApi.getById(deckId),
      deckItemApi.getPage(
        { page: 0, size: 200, sort: "orderIndex,asc" },
        undefined,
        { deckId: Number(deckId) } as never
      ),
    ])
      .then(async ([d, itemsPage]) => {
        setDeck(d);
        setTitle(d.title ?? "");
        setDescription(d.description ?? "");
        setVisibility((d.visibility as "PUBLIC" | "PRIVATE") ?? "PUBLIC");
        setDeckIcon(d.deckIcon ?? DEFAULT_ICON);
        setDeckColor(d.deckColor ?? DEFAULT_COLOR);

        const items = (itemsPage.content ?? []).sort(
          (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
        );

        const flashcards = await Promise.all(
          items.map((item) => flashcardApi.getById(String(item.flashcardId)))
        );

        const allDrafts: CardDraft[] = items.map((item, i) => {
          const fc = flashcards[i]!;
          return {
            uid: crypto.randomUUID(),
            flashcardId: fc.id,
            deckItemId: item.id,
            front: getTextContent(fc.sides, "FRONT") || fc.front || "",
            back: getTextContent(fc.sides, "BACK") || fc.back || "",
            imageUrl: getImageContent(fc.sides) || fc.imageUrl || undefined,
          };
        });

        // Enforce 1000-card limit even on load
        const drafts = allDrafts.slice(0, MAX_CARDS);
        const initialCards = drafts.map(({ uid, flashcardId, front, back, imageUrl }) => ({
          uid, flashcardId, front, back, imageUrl,
        }));
        initialStateRef.current = {
          title: d.title ?? "",
          description: d.description ?? "",
          visibility: (d.visibility as "PUBLIC" | "PRIVATE") ?? "PUBLIC",
          deckIcon:  d.deckIcon  ?? DEFAULT_ICON,
          deckColor: d.deckColor ?? DEFAULT_COLOR,
          cards: initialCards,
        };

        setCards(drafts.length > 0 ? drafts : [makeCard(), makeCard()]);
      })
      .catch(() => toast.error("Không thể tải deck."))
      .finally(() => setLoading(false));
  }, [deckId]);

  /* ── Card helpers ── */
  const removeCard = (uid: string) =>
    setCards((p) =>
      p.map((c) => (c.uid === uid ? { ...c, pendingDelete: true } : c))
    );

  const updateCard = (uid: string, field: "front" | "back", value: string) =>
    setCards((p) => p.map((c) => (c.uid === uid ? { ...c, [field]: value } : c)));

  const setCardImage = (uid: string, file: File, preview: string) =>
    setCards((p) =>
      p.map((c) => (c.uid === uid ? { ...c, imageFile: file, imagePreview: preview, imageUrl: undefined } : c))
    );

  const clearCardImage = (uid: string) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === uid
          ? { ...c, imageFile: undefined, imagePreview: undefined, imageUrl: undefined }
          : c
      )
    );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setCards((items) => {
      const visible = items.filter((c) => !c.pendingDelete);
      const oldIdx = visible.findIndex((c) => c.uid === active.id);
      const newIdx = visible.findIndex((c) => c.uid === over.id);
      const reordered = arrayMove(visible, oldIdx, newIdx);
      const deleted = items.filter((c) => c.pendingDelete);
      return [...reordered, ...deleted];
    });
  };

  /* ── Save (bulk batches of BATCH_SIZE) ── */
  const handleSave = async () => {
    setSubmitted(true);
    if (!title.trim()) { toast.error("Hãy nhập tiêu đề deck."); return; }
    if (!deckId) return;

    const active = cards.filter((c) => !c.pendingDelete);
    if (active.length === 0) { toast.error("Thêm ít nhất một card."); return; }

    // Validate all visible cards have both term AND definition
    const invalidCards = active.filter((c) => !c.front.trim() || !c.back.trim());
    if (invalidCards.length > 0) {
      toast.error(`${invalidCards.length} thẻ chưa điền đủ thuật ngữ và định nghĩa.`);
      return;
    }

    setSaving(true);
    try {
      /* 1 — Update deck metadata */
      await deckApi.update(deckId, {
        ...deck,
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        deckIcon,
        deckColor,
        totalCards: active.length,
      } as never);

      /* 2 — Delete removed cards (concurrency-limited) */
      const toDelete = cards.filter((c) => c.pendingDelete && c.deckItemId);
      await pLimit(
        toDelete.map((c) => async () => {
          if (c.deckItemId) await deckItemApi.delete(String(c.deckItemId));
          if (c.flashcardId) await flashcardApi.delete(String(c.flashcardId)).catch(() => {});
        }),
        CONCURRENCY
      );

      /* 3 — Save active cards in logical chunks of BATCH_SIZE,
             each chunk runs with limited concurrency to avoid 429 */
      const saveOne = async (card: CardDraft, orderIndex: number) => {
        let imageUrl = card.imageUrl;
        if (card.imageFile) {
          try {
            const att = await fileApi.upload(card.imageFile, "flashcard", card.flashcardId ?? 0, "imageUrl");
            imageUrl = att.url;
          } catch { /* non-fatal — continue without image */ }
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

        if (card.flashcardId) {
          await withRetry(() => flashcardApi.update(String(card.flashcardId!), {
            cardType: "BASIC", itemType: "WORD", itemId: 0, isActive: true, sides,
          } as never));
          if (card.deckItemId) {
            await withRetry(() => deckItemApi.update(String(card.deckItemId!), {
              deckId: Number(deckId), flashcardId: card.flashcardId, orderIndex, isActive: true,
            } as never));
          }
        } else {
          const fc = await withRetry(() => flashcardApi.create({
            cardType: "BASIC", itemType: "WORD", itemId: 0, isActive: true, sides,
          }));
          await withRetry(() => deckItemApi.create({
            deckId: Number(deckId), flashcardId: fc.id, orderIndex, isActive: true,
          }));
        }
      };

      /* Process in BATCH_SIZE chunks sequentially,
         within each chunk use CONCURRENCY parallel workers */
      for (let start = 0; start < active.length; start += BATCH_SIZE) {
        const chunk = active.slice(start, start + BATCH_SIZE);
        await pLimit(
          chunk.map((card, j) => () => saveOne(card, start + j)),
          CONCURRENCY
        );
      }

      toast.success("Deck đã được lưu!");
      navigate("/library");
    } catch {
      toast.error("Lưu thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Derived ── */
  const visibleCards = cards.filter((c) => !c.pendingDelete);

  const hasChanges = useMemo(() => {
    const init = initialStateRef.current;
    if (!init) return false;
    if (title !== init.title || description !== init.description || visibility !== init.visibility) return true;
    if (deckIcon !== init.deckIcon || deckColor !== init.deckColor) return true;
    if (cards.some((c) => c.pendingDelete && c.flashcardId)) return true;
    if (cards.some((c) => c.imageFile)) return true;
    const active = cards.filter((c) => !c.pendingDelete);
    if (active.length !== init.cards.length) return true;
    return active.some((c, i) => {
      const b = init.cards[i]!;
      return c.flashcardId !== b.flashcardId || c.front !== b.front || c.back !== b.back;
    });
  }, [title, description, visibility, deckIcon, deckColor, cards]);

  /* Detect duplicate fronts (same trimmed+lowercased front text) */
  const duplicateFronts = useMemo(() => {
    const counts: Record<string, number> = {};
    visibleCards.forEach((c) => {
      const key = c.front.trim().toLowerCase();
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    });
    return new Set(
      Object.entries(counts)
        .filter(([, n]) => n > 1)
        .map(([k]) => k)
    );
  }, [visibleCards]);

  /* ── Shared MainLayout props ── */
  const layoutProps = {
    parentCrumb: { href: "/library", title: "My Library" },
    ignorePaths: ["deck"],
    pathName: {
      [`/deck/${deckId}`]:       deck?.title ?? "…",  // rename ID → deck title (clickable → study page)
      [`/deck/${deckId}/edit`]:  "Chỉnh sửa",         // last segment
    },
    pageDescription: description || "Chỉnh sửa nội dung bộ thẻ Quizlet.",
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <MainLayout {...layoutProps} pageScroll>
        <div className="flex items-center justify-center h-64 gap-3">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Đang tải deck…</span>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout {...layoutProps} pageScroll>
      <div className="w-full pb-6 space-y-4 pt-1">

        {/* ── Action bar (TOP) ── */}
        <div className="flex items-center justify-between gap-2">
          {/* Visibility toggle + Icon picker — left */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisibility((v) => v === "PUBLIC" ? "PRIVATE" : "PUBLIC")}
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-all",
                visibility === "PUBLIC"
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={visibility === "PUBLIC" ? "Công khai — click để đổi riêng tư" : "Riêng tư — click để đổi công khai"}
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

          {/* Cancel + Save — right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/library")}
              disabled={saving}
              className="h-9 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
            >
              Hủy
            </button>
            {hasChanges && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {saving
                  ? <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />Đang lưu…</span>
                  : "Lưu"}
              </button>
            )}
          </div>
        </div>

        {/* ── Title + Description card (icon picker bên trong) ── */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden divide-y divide-border">
          {/* Title */}
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

          {/* Description */}
          <div className="px-5 pt-3 pb-4 space-y-1">
            <InfoLabel
              title={<span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Mô tả</span>}
              info="Mô tả ngắn về nội dung bộ thẻ. Hiển thị trong tooltip ⓘ trên breadcrumb."
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

        {/* ── Card count + Add/Import buttons ── */}
        <div className="flex items-center justify-between px-1">
          <InfoLabel
            title={
              <p className="text-sm font-semibold text-foreground">
                Số thẻ: <span className="text-primary">({visibleCards.length})</span>
              </p>
            }
            info="Tổng số thẻ đang có trong deck (chưa xóa)."
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

        {/* Card list — shared component */}
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

        {/* Bottom add button */}
        <AddCardButton onClick={addCard} />
        <div ref={bottomRef} />

        <ImportCardsModal
          open={importOpen}
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      </div>
    </MainLayout>
  );
}

