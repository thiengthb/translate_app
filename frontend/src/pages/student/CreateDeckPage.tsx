import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { deckApi, deckItemApi, flashcardApi, flashcardTemplateApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { Brush, Globe, GraduationCap, Layers, Loader2, Lock, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { getCurrentUserId } from "@/utils/auth.utils";
import { DeckIconColorPicker, DEFAULT_ICON, DEFAULT_COLOR } from "@/components/common/DeckIconColorPicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  FlashcardSideContentDTO,
  FlashcardSideDTO,
  FlashcardTemplateDTO,
} from "@/types";
import type { AvailableTemplateField } from "@/features/card-template-designer/types";
import { buildStateFromFields } from "@/features/card-template-designer/presets";
import { generateTemplates } from "@/features/card-template-designer/template-generation";
import { ImportFieldCardsModal, type ImportedFieldRow } from "@/components/common/ImportFieldCardsModal";
import { InfoLabel } from "@/components/common/InfoLabel";
import {
  cellFilled,
  defaultFields,
  fieldsFromBuilderConfig,
  FIELD_PRESETS,
  FieldCardList,
  FieldStructureEditor,
  makeFieldCard,
  type FieldCardDraft,
  type FieldDef,
} from "./shared/FieldDeckEditor";

/* ─── Limits + concurrency ─── */
const MAX_CARDS    = 1000;
const BATCH_SIZE   = 100;
const CONCURRENCY  = 3;

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

const UPLOAD_FIELD: Record<string, string> = { IMAGE: "imageUrl", AUDIO: "audioUrl", VIDEO: "videoUrl" };

/* ─────────────────────────────────────────
   Create deck — one unified, field-based flow.

   The deck has a shared card STRUCTURE (an ordered list of fields, each with a
   name / side / type). Every card carries one value per field, so rich
   multi-field cards are authored in bulk — typed in the grid or pasted via the
   multi-column importer — instead of edited one-by-one after creation. On save
   the same structure is turned into the deck's render template automatically.
───────────────────────────────────────── */
export default function CreateDeckPage() {
  const navigate = useNavigate();
  const userId = getCurrentUserId();

  const [title, setTitle]             = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility]   = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [deckIcon, setDeckIcon]       = useState<string>(DEFAULT_ICON);
  const [deckColor, setDeckColor]     = useState(DEFAULT_COLOR);
  const [fields, setFields]           = useState<FieldDef[]>(() => defaultFields());
  const [cards, setCards]             = useState<FieldCardDraft[]>(() => {
    const f = defaultFields();
    return [makeFieldCard(f), makeFieldCard(f)];
  });
  const [saving, setSaving]           = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [importOpen, setImportOpen]   = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<FlashcardTemplateDTO[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  // When set, the deck REUSES this existing template (attach its id) instead of
  // generating a new one on save. Cleared when the user starts a fresh structure.
  const [selectedTemplate, setSelectedTemplate] = useState<FlashcardTemplateDTO | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();

  /* ── Structure ── */
  const applyPreset = (build: () => FieldDef[]) => {
    const f = build();
    setSelectedTemplate(null); // a fresh preset structure → generate a new template on save
    setFields(f);
    setCards([makeFieldCard(f), makeFieldCard(f)]); // fresh cards keyed to the new fields
  };

  /** Adopt a saved template (reuse): remember its id so we ATTACH it on save —
   *  never create a duplicate — and seed the matching field structure. */
  const seedFromTemplate = (tpl: FlashcardTemplateDTO, notify = true) => {
    setSelectedTemplate(tpl);
    const f = fieldsFromBuilderConfig(tpl.builderConfigJson);
    if (f.length > 0) {
      setFields(f);
      setCards([makeFieldCard(f), makeFieldCard(f)]);
    }
    if (notify) toast.success(`Đang dùng mẫu "${tpl.name}".`);
  };

  /** Lazy-load the user's saved templates the first time the picker opens. */
  const loadTemplates = () => {
    if (templatesLoaded) return;
    setTemplatesLoaded(true);
    flashcardTemplateApi
      .listForUser(userId ?? undefined)
      // Only shared masters are reusable; deck-local copies stay private.
      .then((list) => setSavedTemplates(list.filter((t) => t.deckId == null)))
      .catch((err) => logger.warn("Failed to load templates", err));
  };

  /* Reuse via `?template=<id>` (e.g. "Dùng mẫu này" from the template library). */
  useEffect(() => {
    const tid = searchParams.get("template");
    if (!tid) return;
    flashcardTemplateApi
      .getById(tid)
      .then((tpl) => seedFromTemplate(tpl, false))
      .catch((err) => logger.warn("Failed to load template for reuse", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Cards ── */
  const addCard = () =>
    setCards((p) => {
      if (p.length >= MAX_CARDS) {
        toast.error(`Giới hạn tối đa ${MAX_CARDS} thẻ.`);
        return p;
      }
      return [...p, makeFieldCard(fields)];
    });

  const addCardAndScroll = () => {
    addCard();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }), 80);
  };

  const handleImport = (rows: ImportedFieldRow[]) => {
    setCards((prev) => {
      const remaining = MAX_CARDS - prev.length;
      if (remaining <= 0) { toast.error(`Deck đã đạt giới hạn ${MAX_CARDS} thẻ.`); return prev; }
      const toAdd = rows.slice(0, remaining);
      if (toAdd.length < rows.length)
        toast.warning(`Chỉ thêm ${toAdd.length}/${rows.length} thẻ (giới hạn ${MAX_CARDS}).`);
      const built = toAdd.map((row) => {
        const card = makeFieldCard(fields);
        for (const [fieldId, text] of Object.entries(row)) {
          if (card.values[fieldId]) card.values[fieldId] = { text };
        }
        return card;
      });
      return [...prev, ...built];
    });
  };

  /* ── Derived / validation ── */
  const hasFront = fields.some((f) => f.side === "FRONT");
  const hasBack  = fields.some((f) => f.side === "BACK");

  const isCardValid = (c: FieldCardDraft) => {
    const frontOk = fields.some((f) => f.side === "FRONT" && cellFilled(c.values[f.id]));
    const backOk  = fields.some((f) => f.side === "BACK"  && cellFilled(c.values[f.id]));
    return frontOk && backOk;
  };
  const validCards = useMemo(() => cards.filter(isCardValid), [cards, fields]);
  const canCreate  = title.trim().length > 0 && hasFront && hasBack && validCards.length >= 2;

  /* ── Build a flashcard's sides from a card's field values (uploads media). ── */
  const buildSides = async (card: FieldCardDraft): Promise<FlashcardSideDTO[]> => {
    const sides: FlashcardSideDTO[] = [];
    for (const side of ["FRONT", "BACK"] as const) {
      const contents: FlashcardSideContentDTO[] = [];
      const sideFields = fields.filter((f) => f.side === side);
      for (let order = 0; order < sideFields.length; order++) {
        const f = sideFields[order];
        const v = card.values[f.id];
        if (!cellFilled(v)) continue;

        let value = v!.text.trim();
        if (f.type !== "TEXT" && v!.file) {
          try {
            const att = await fileApi.upload(v!.file, "flashcard", 0, UPLOAD_FIELD[f.type]);
            value = att.url;
          } catch {
            continue; // skip a failed media upload rather than abort the whole deck
          }
        }
        if (!value) continue;

        contents.push({ label: f.name.trim() || undefined, contentType: f.type, contentValue: value, orderIndex: order });
      }
      if (contents.length > 0) sides.push({ side, contents });
    }
    return sides;
  };

  /* ── Turn the field structure into a render template and attach it. ── */
  const applyAutoTemplate = async (deckId: number) => {
    const available: AvailableTemplateField[] = fields.map((f) => ({
      name: f.name.trim() || "Field",
      side: f.side,
      contentType: f.type,
      label: f.name.trim() || "Field",
      preview: f.name.trim() || "Field",
    }));
    const state = buildStateFromFields(available);
    const { frontTemplate, backTemplate, styling } = generateTemplates(state);
    // Use the base CRUD create (carries userId) so the template is OWNED by the
    // user and shows up in their reusable template library afterwards.
    const created = await flashcardTemplateApi.create({
      userId,
      cardType: null,
      name: `${title.trim() || "Deck"} template`,
      description: null,
      frontTemplate: frontTemplate || null,
      backTemplate: backTemplate || null,
      styling: styling || null,
      builderConfigJson: JSON.stringify(state),
      isSystem: false,
      isDefault: false,
      visibility: "PRIVATE",
      isActive: true, // BaseDTO requires @NotNull(isActive) on create
    } as FlashcardTemplateDTO);
    if (created.id != null) await deckApi.applyTemplate(deckId, created.id);
  };

  /* ── Save ──
     `after` decides where we land once the deck is persisted:
       - "library"  → the library list
       - "study"    → straight into studying the new deck
       - "template" → the card-template designer to refine the auto-generated template */
  const handleSave = async (after: "library" | "study" | "template" = "library") => {
    setSubmitted(true);
    if (!title.trim()) { toast.error("Hãy nhập tiêu đề deck."); return; }
    if (!hasFront || !hasBack) { toast.error("Cấu trúc thẻ cần ít nhất một trường Mặt trước và một trường Mặt sau."); return; }
    const invalid = cards.filter((c) => !isCardValid(c));
    if (invalid.length > 0) { toast.error(`${invalid.length} thẻ chưa điền đủ mặt trước và mặt sau.`); return; }
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

      const saveOne = async (card: FieldCardDraft, orderIndex: number) => {
        const sides = await buildSides(card);
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

      // Attach the render template (non-fatal). REUSE the chosen existing
      // template when one was picked — otherwise generate a fresh one from the
      // structure. This is what stops reuse from silently creating a duplicate.
      if (deck.id != null) {
        try {
          if (selectedTemplate?.id != null) {
            await deckApi.applyTemplate(deck.id, selectedTemplate.id);
          } else {
            await applyAutoTemplate(deck.id);
          }
        } catch { /* deck + cards already saved; template is a best-effort extra */ }
      }

      toast.success("Deck đã được tạo!");
      const target =
        after === "template" && deck.id
          ? `/deck/${deck.id}/anki/template`
          : after === "study" && deck.id
            ? `/deck/${deck.id}`
            : "/library";
      navigate(target);
    } catch {
      toast.error("Tạo deck thất bại. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: "/library", title: "My Library" }}
      pathName={{ "/create-deck": "Tạo deck" }}
      pageScroll
    >
      <div className="w-full space-y-4 pb-6 pt-1">

        {/* ── Action bar ── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVisibility((v) => (v === "PUBLIC" ? "PRIVATE" : "PUBLIC"))}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all",
                visibility === "PUBLIC"
                  ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                  : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {visibility === "PUBLIC" ? <><Globe className="size-4" />Công khai</> : <><Lock className="size-4" />Riêng tư</>}
            </button>
            <DeckIconColorPicker icon={deckIcon} color={deckColor} onChange={(ic, cl) => { setDeckIcon(ic); setDeckColor(cl); }} compact />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/library")}
              disabled={saving}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              onClick={() => handleSave("library")}
              disabled={saving || !canCreate}
              title={!canCreate ? "Cần tiêu đề + ít nhất 2 thẻ đủ nội dung" : undefined}
              className="h-9 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? <span className="flex items-center gap-1.5"><Loader2 className="size-3.5 animate-spin" />Đang tạo…</span> : "Tạo deck"}
            </button>
            <button
              onClick={() => handleSave("study")}
              disabled={saving || !canCreate}
              title={!canCreate ? "Cần tiêu đề + ít nhất 2 thẻ đủ nội dung" : undefined}
              className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GraduationCap className="size-4" />
              Tạo &amp; học
            </button>
          </div>
        </div>

        {/* ── Title + Description ── */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm divide-y divide-border">
          <div className="space-y-1 px-5 pb-4 pt-3">
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
              className="w-full resize-none border-b-2 border-border bg-transparent pb-2 text-base font-semibold leading-snug text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-1 px-5 pb-4 pt-3">
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
              className="w-full resize-none border-b-2 border-border bg-transparent pb-0 text-sm leading-snug text-foreground placeholder:text-muted-foreground/50 transition-colors focus:border-primary focus:outline-none"
            />
          </div>
        </div>

        {/* ── Card structure (fields) ── */}
        <div className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <InfoLabel
              title={<p className="text-sm font-semibold text-foreground">Cấu trúc thẻ</p>}
              info="Các trường dùng chung cho mọi thẻ trong deck — mỗi trường có tên, mặt (trước/sau) và loại nội dung. Cấu trúc này cũng được dùng để tạo mẫu hiển thị."
              side="right"
            />
            <div className="flex items-center gap-1.5">
              <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">Mẫu nhanh:</span>
              {FIELD_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.build)}
                  className="h-7 rounded-md border border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {p.label}
                </button>
              ))}
              <DropdownMenu onOpenChange={(o) => { if (o) loadTemplates(); }}>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                    <Layers className="size-3.5" />
                    Mẫu có sẵn
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
                  {savedTemplates.length === 0 ? (
                    <div className="px-2 py-3 text-center text-xs text-muted-foreground">
                      {templatesLoaded ? "Chưa có mẫu thẻ nào" : "Đang tải…"}
                    </div>
                  ) : (
                    savedTemplates.map((t) => (
                      <DropdownMenuItem key={t.id} className="gap-2" onClick={() => seedFromTemplate(t)}>
                        <Layers className="size-3.5 text-muted-foreground" />
                        <span className="truncate">{t.name}</span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Reuse banner — shows when the deck will ATTACH an existing template. */}
          {selectedTemplate && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-foreground">
                <Layers className="size-3.5 shrink-0 text-primary" />
                Đang dùng lại mẫu:{" "}
                <span className="truncate font-semibold">{selectedTemplate.name}</span>
              </span>
              <button
                onClick={() => setSelectedTemplate(null)}
                title="Bỏ chọn — sẽ tự tạo mẫu mới từ cấu trúc này"
                className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-3.5" />
                Bỏ chọn
              </button>
            </div>
          )}

          <FieldStructureEditor fields={fields} onChange={setFields} />
        </div>

        {/* ── Card count + Add/Import ── */}
        <div className="flex items-center justify-between px-1">
          <InfoLabel
            title={<p className="text-sm font-semibold text-foreground">Số thẻ: <span className="text-primary">({cards.length})</span></p>}
            info="Tổng số thẻ trong deck."
            side="right"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSave("template")}
              disabled={saving || !canCreate}
              title={
                canCreate
                  ? "Tạo deck rồi mở trình thiết kế để tinh chỉnh mẫu hiển thị (mẫu được tự sinh từ cấu trúc thẻ)"
                  : "Cần tiêu đề + ít nhất 2 thẻ đủ nội dung trước khi thiết kế mẫu thẻ"
              }
              className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Brush className="size-3.5" />
              Mẫu thẻ
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
            >
              <Upload className="size-3.5" />
              Import nhiều cột
            </button>
            <button
              onClick={addCardAndScroll}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="size-3.5" />
              Thêm thẻ
            </button>
          </div>
        </div>

        {/* ── Card list ── */}
        <FieldCardList fields={fields} cards={cards} onChange={setCards} submitted={submitted} />

        {/* ── Bottom add button ── */}
        <button
          onClick={addCard}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent/40 hover:text-foreground"
        >
          <Plus className="size-4" />
          Thêm thẻ
        </button>
        <div ref={bottomRef} />

        {/* ── Import modal ── */}
        <ImportFieldCardsModal open={importOpen} onClose={() => setImportOpen(false)} fields={fields} onImport={handleImport} />

        {/* ── Ready count hint ── */}
        {validCards.length > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{validCards.length}</span> thẻ đủ nội dung
            {validCards.length < 2 && <span className="ml-1 text-destructive">— cần ít nhất 2 thẻ</span>}
          </p>
        )}
      </div>
    </MainLayout>
  );
}
