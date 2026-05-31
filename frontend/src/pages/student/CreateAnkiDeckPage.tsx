import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, deckItemApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  Brain,
  ChevronDown,
  ChevronLeft,
  Globe,
  Image as ImageIcon,
  Lock,
  Mic,
  Plus,
  ScrollText,
  Square,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import type {
  FlashcardContentType,
  FlashcardSideDTO,
  FlashcardSideType,
} from "@/types";

/* ─────────────────────────────────────────
   Drafts
───────────────────────────────────────── */
interface ContentDraft {
  uid: string;
  label?: string;
  contentType: FlashcardContentType;
  /** For TEXT/CLOZE: raw text. For IMAGE/AUDIO: blob URL preview before upload. */
  contentValue: string;
  /** Pending file to upload (IMAGE/AUDIO). */
  file?: File;
}

interface SideDraft {
  side: FlashcardSideType;
  contents: ContentDraft[];
}

interface CardDraft {
  uid: string;
  cardType: "BASIC" | "CLOZE" | "VOCAB" | "KANJI";
  hint: string;
  explanation: string;
  expanded: boolean;
  sides: SideDraft[];
}

const CARD_TYPES: { value: CardDraft["cardType"]; label: string; hint: string }[] = [
  { value: "BASIC", label: "Basic", hint: "Generic front ↔ back card" },
  { value: "CLOZE", label: "Cloze", hint: "Fill-in-the-blank with {{c1::…}} tokens" },
  { value: "VOCAB", label: "Vocab", hint: "Word + reading + meaning + audio" },
  { value: "KANJI", label: "Kanji", hint: "Character + readings + meanings" },
];

const CONTENT_TYPES: {
  value: FlashcardContentType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "TEXT", label: "Text", icon: <Type className="size-3.5" /> },
  { value: "IMAGE", label: "Image", icon: <ImageIcon className="size-3.5" /> },
  { value: "AUDIO", label: "Audio", icon: <Mic className="size-3.5" /> },
  { value: "VIDEO", label: "Video", icon: <Video className="size-3.5" /> },
  { value: "CLOZE", label: "Cloze", icon: <Square className="size-3.5" /> },
];

const makeContent = (
  contentType: FlashcardContentType = "TEXT",
  contentValue = ""
): ContentDraft => ({
  uid: crypto.randomUUID(),
  contentType,
  contentValue,
});

const makeCard = (): CardDraft => ({
  uid: crypto.randomUUID(),
  cardType: "BASIC",
  hint: "",
  explanation: "",
  expanded: true,
  sides: [
    { side: "FRONT", contents: [makeContent("TEXT")] },
    { side: "BACK", contents: [makeContent("TEXT")] },
  ],
});

/* ─────────────────────────────────────────
   Page
───────────────────────────────────────── */
export default function CreateAnkiDeckPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
  const [cards, setCards] = useState<CardDraft[]>([makeCard()]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Card mutators ── */
  const patchCard = (uid: string, patch: Partial<CardDraft>) =>
    setCards((p) => p.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));

  const addCard = () => setCards((p) => [...p, makeCard()]);
  const removeCard = (uid: string) => setCards((p) => p.filter((c) => c.uid !== uid));

  const addSide = (cardUid: string, side: FlashcardSideType) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === cardUid
          ? {
              ...c,
              sides: [...c.sides, { side, contents: [makeContent("TEXT")] }],
            }
          : c
      )
    );

  const removeSide = (cardUid: string, sideIndex: number) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === cardUid
          ? { ...c, sides: c.sides.filter((_, i) => i !== sideIndex) }
          : c
      )
    );

  const addContent = (
    cardUid: string,
    sideIndex: number,
    contentType: FlashcardContentType
  ) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === cardUid
          ? {
              ...c,
              sides: c.sides.map((s, i) =>
                i === sideIndex
                  ? { ...s, contents: [...s.contents, makeContent(contentType)] }
                  : s
              ),
            }
          : c
      )
    );

  const updateContent = (
    cardUid: string,
    sideIndex: number,
    contentUid: string,
    patch: Partial<ContentDraft>
  ) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === cardUid
          ? {
              ...c,
              sides: c.sides.map((s, i) =>
                i === sideIndex
                  ? {
                      ...s,
                      contents: s.contents.map((co) =>
                        co.uid === contentUid ? { ...co, ...patch } : co
                      ),
                    }
                  : s
              ),
            }
          : c
      )
    );

  const removeContent = (cardUid: string, sideIndex: number, contentUid: string) =>
    setCards((p) =>
      p.map((c) =>
        c.uid === cardUid
          ? {
              ...c,
              sides: c.sides.map((s, i) =>
                i === sideIndex
                  ? { ...s, contents: s.contents.filter((co) => co.uid !== contentUid) }
                  : s
              ),
            }
          : c
      )
    );

  /* ── Submit ── */
  const handleCreate = async (practice = false) => {
    if (!title.trim()) {
      toast.error("Please enter a deck title.");
      return;
    }
    if (cards.length === 0) {
      toast.error("Add at least one card.");
      return;
    }

    // Validate each card has at least front + back text content
    for (const [i, card] of cards.entries()) {
      const front = card.sides.find((s) => s.side === "FRONT");
      const back = card.sides.find((s) => s.side === "BACK");
      if (!front || !back) {
        toast.error(`Card ${i + 1} needs both a FRONT and BACK side.`);
        return;
      }
      const hasFrontText = front.contents.some(
        (c) => (c.contentType === "TEXT" || c.contentType === "CLOZE") && c.contentValue.trim()
      );
      const hasBackText = back.contents.some(
        (c) => (c.contentType === "TEXT" || c.contentType === "CLOZE") && c.contentValue.trim()
      );
      if (!hasFrontText || !hasBackText) {
        toast.error(`Card ${i + 1} needs text on both FRONT and BACK.`);
        return;
      }
    }

    const userId = getCurrentUserId();
    setSubmitting(true);
    try {
      const deck = await deckApi.create({
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        totalCards: cards.length,
        isActive: true,
      });

      for (const [i, card] of cards.entries()) {
        // Build the sides DTO; IMAGE/AUDIO contents that still have a File get uploaded first.
        const builtSides: FlashcardSideDTO[] = [];

        for (const side of card.sides) {
          const builtContents = [];
          for (let order = 0; order < side.contents.length; order++) {
            const co = side.contents[order];

            let value = co.contentValue;
            if (
              (co.contentType === "IMAGE" ||
                co.contentType === "AUDIO" ||
                co.contentType === "VIDEO") &&
              co.file
            ) {
              try {
                const fieldName =
                  co.contentType === "IMAGE"
                    ? "imageUrl"
                    : co.contentType === "AUDIO"
                      ? "audioUrl"
                      : "videoUrl";
                const attachment = await fileApi.upload(co.file, "flashcard", 0, fieldName);
                value = attachment.url;
              } catch {
                toast.error(`Failed to upload ${co.contentType.toLowerCase()} on card ${i + 1}.`);
                continue;
              }
            }

            if (!value.trim()) continue;

            builtContents.push({
              label: co.label?.trim() || undefined,
              contentType: co.contentType,
              contentValue: value,
              orderIndex: order,
            });
          }

          if (builtContents.length === 0) continue;
          builtSides.push({ side: side.side, contents: builtContents });
        }

        const fc = await flashcardApi.create({
          cardType: card.cardType,
          itemType: "WORD",
          itemId: 0,
          hint: card.hint.trim() || undefined,
          explanation: card.explanation.trim() || undefined,
          isActive: true,
          sides: builtSides,
        });

        await deckItemApi.create({
          deckId: deck.id,
          flashcardId: fc.id,
          orderIndex: i,
          isActive: true,
        });
      }

      toast.success("Anki deck created!");
      navigate(practice && deck.id ? `/deck/${deck.id}/anki` : "/library");
    } catch {
      toast.error("Failed to create deck. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout pathName={{ "/create-deck/anki": "Anki deck" }}>
      <div className="w-full pb-32 space-y-5">
        {/* Back */}
        <button
          onClick={() => navigate("/create-deck")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
        >
          <ChevronLeft className="size-4" />
          Pick another mode
        </button>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Brain className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Create an Anki deck
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Rich cards · multiple sides · text / image / audio / cloze · scheduled with SM2
            </p>
          </div>
        </div>

        {/* Title / description */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Deck title"
            className="w-full px-5 py-4 text-base font-semibold bg-transparent text-foreground placeholder:text-muted-foreground border-b border-border focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description…"
            rows={2}
            className="w-full px-5 py-3 text-sm bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
          />
        </div>

        {/* Visibility */}
        <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Visibility</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose who can see this deck
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <VisibilityCard
              active={visibility === "PUBLIC"}
              onClick={() => setVisibility("PUBLIC")}
              icon={<Globe className="size-4" />}
              title="Public"
              description="Anyone can find and study this deck"
            />
            <VisibilityCard
              active={visibility === "PRIVATE"}
              onClick={() => setVisibility("PRIVATE")}
              icon={<Lock className="size-4" />}
              title="Private"
              description="Only you can see and study this deck"
            />
          </div>
        </div>

        {/* Cards */}
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <motion.div
                key={card.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <AnkiCardEditor
                  index={i + 1}
                  card={card}
                  canDelete={cards.length > 1}
                  onPatch={(patch) => patchCard(card.uid, patch)}
                  onDelete={() => removeCard(card.uid)}
                  onAddSide={(side) => addSide(card.uid, side)}
                  onRemoveSide={(idx) => removeSide(card.uid, idx)}
                  onAddContent={(sideIdx, ct) => addContent(card.uid, sideIdx, ct)}
                  onUpdateContent={(sideIdx, contentUid, patch) =>
                    updateContent(card.uid, sideIdx, contentUid, patch)
                  }
                  onRemoveContent={(sideIdx, contentUid) =>
                    removeContent(card.uid, sideIdx, contentUid)
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add card */}
        <div className="flex justify-center pt-2">
          <button
            onClick={addCard}
            className="flex items-center gap-2 px-10 py-3 rounded-full border-2 border-border text-sm font-semibold text-foreground hover:bg-accent hover:border-foreground/20 transition-colors"
          >
            <Plus className="size-4" />
            Add a card
          </button>
        </div>

        {/* Submit */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground mr-auto self-center hidden sm:block">
            {cards.length} card{cards.length !== 1 ? "s" : ""} ready · ANKI mode
          </p>
          <button
            onClick={() => handleCreate(false)}
            disabled={submitting}
            className="px-8 py-2.5 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50 transition-colors"
          >
            {submitting ? "Creating…" : "Save"}
          </button>
          <button
            onClick={() => handleCreate(true)}
            disabled={submitting}
            className="px-8 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Save and study
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Visibility card (shared)
───────────────────────────────────────── */
function VisibilityCard({
  active,
  onClick,
  icon,
  title,
  description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all",
        active
          ? "border-primary bg-primary/5"
          : "border-border hover:border-foreground/20 hover:bg-accent"
      )}
    >
      <div
        className={cn(
          "shrink-0 size-9 rounded-lg flex items-center justify-center mt-0.5",
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div>
        <p className={cn("text-sm font-semibold", active ? "text-primary" : "text-foreground")}>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────
   Anki card editor
───────────────────────────────────────── */
function AnkiCardEditor({
  index,
  card,
  canDelete,
  onPatch,
  onDelete,
  onAddSide,
  onRemoveSide,
  onAddContent,
  onUpdateContent,
  onRemoveContent,
}: {
  index: number;
  card: CardDraft;
  canDelete: boolean;
  onPatch: (patch: Partial<CardDraft>) => void;
  onDelete: () => void;
  onAddSide: (side: FlashcardSideType) => void;
  onRemoveSide: (sideIndex: number) => void;
  onAddContent: (sideIndex: number, contentType: FlashcardContentType) => void;
  onUpdateContent: (
    sideIndex: number,
    contentUid: string,
    patch: Partial<ContentDraft>
  ) => void;
  onRemoveContent: (sideIndex: number, contentUid: string) => void;
}) {
  const existingSides = new Set(card.sides.map((s) => s.side));
  const availableSides: FlashcardSideType[] = (["FRONT", "BACK", "HINT"] as const).filter(
    (s) => !existingSides.has(s)
  );

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/40">
        <div className="flex items-center gap-3">
          <span className="size-7 rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-400 text-xs font-bold flex items-center justify-center">
            {index}
          </span>

          {/* Card type picker */}
          <CardTypeSelect
            value={card.cardType}
            onChange={(v) => onPatch({ cardType: v })}
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPatch({ expanded: !card.expanded })}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
            title={card.expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn(
                "size-4 transition-transform",
                card.expanded ? "rotate-0" : "-rotate-90"
              )}
            />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-background disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Delete card"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {card.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="p-5 space-y-4">
              {/* Sides */}
              {card.sides.map((side, sideIdx) => (
                <SideBlock
                  key={`${card.uid}-${side.side}-${sideIdx}`}
                  side={side}
                  canRemove={side.side === "HINT"}
                  onRemoveSide={() => onRemoveSide(sideIdx)}
                  onAddContent={(ct) => onAddContent(sideIdx, ct)}
                  onUpdateContent={(uid, patch) => onUpdateContent(sideIdx, uid, patch)}
                  onRemoveContent={(uid) => onRemoveContent(sideIdx, uid)}
                />
              ))}

              {/* Add side */}
              {availableSides.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground">Add side:</span>
                  {availableSides.map((s) => (
                    <button
                      key={s}
                      onClick={() => onAddSide(s)}
                      className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Hint / Explanation */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border">
                <FieldArea
                  label="Hint"
                  icon={<ScrollText className="size-3.5" />}
                  value={card.hint}
                  onChange={(v) => onPatch({ hint: v })}
                  placeholder="Optional hint shown on demand"
                />
                <FieldArea
                  label="Explanation"
                  icon={<ScrollText className="size-3.5" />}
                  value={card.explanation}
                  onChange={(v) => onPatch({ explanation: v })}
                  placeholder="Why is this the answer? Mnemonics, notes, links…"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   Side block
───────────────────────────────────────── */
function SideBlock({
  side,
  canRemove,
  onRemoveSide,
  onAddContent,
  onUpdateContent,
  onRemoveContent,
}: {
  side: SideDraft;
  canRemove: boolean;
  onRemoveSide: () => void;
  onAddContent: (ct: FlashcardContentType) => void;
  onUpdateContent: (uid: string, patch: Partial<ContentDraft>) => void;
  onRemoveContent: (uid: string) => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
            side.side === "FRONT" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
            side.side === "BACK" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            side.side === "HINT" && "bg-sky-500/10 text-sky-600 dark:text-sky-400"
          )}
        >
          {side.side}
        </span>
        {canRemove && (
          <button
            onClick={onRemoveSide}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1"
            title="Remove side"
          >
            <X className="size-3" />
            Remove side
          </button>
        )}
      </div>

      <div className="space-y-2">
        {side.contents.map((co) => (
          <ContentRow
            key={co.uid}
            content={co}
            onChange={(patch) => onUpdateContent(co.uid, patch)}
            onRemove={() => onRemoveContent(co.uid)}
            canRemove={side.contents.length > 1}
          />
        ))}
      </div>

      {/* Add content type pills */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Add:</span>
        {CONTENT_TYPES.map((ct) => (
          <button
            key={ct.value}
            onClick={() => onAddContent(ct.value)}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            {ct.icon}
            {ct.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   Content row
───────────────────────────────────────── */
function ContentRow({
  content,
  onChange,
  onRemove,
  canRemove,
}: {
  content: ContentDraft;
  onChange: (patch: Partial<ContentDraft>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const accept =
    content.contentType === "IMAGE"
      ? "image/*"
      : content.contentType === "AUDIO"
        ? "audio/*"
        : content.contentType === "VIDEO"
          ? "video/*"
          : undefined;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    onChange({ file, contentValue: preview });
    e.target.value = "";
  };

  const typeIcon =
    CONTENT_TYPES.find((t) => t.value === content.contentType)?.icon ?? null;

  return (
    <div className="flex items-start gap-2 group">
      <div className="shrink-0 mt-2 text-muted-foreground" title={content.contentType}>
        {typeIcon}
      </div>

      <div className="flex-1 min-w-0 space-y-1.5">
        <input
          value={content.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label (optional, e.g. Example, Reading…)"
          className="w-full text-xs rounded-md border border-input bg-background px-2.5 py-1 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-ring"
        />

        {(content.contentType === "TEXT" || content.contentType === "CLOZE") && (
          <textarea
            value={content.contentValue}
            onChange={(e) => onChange({ contentValue: e.target.value })}
            placeholder={
              content.contentType === "CLOZE"
                ? "Use {{c1::answer}} to mark a cloze deletion…"
                : "Enter text…"
            }
            rows={2}
            className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        )}

        {(content.contentType === "IMAGE" ||
          content.contentType === "AUDIO" ||
          content.contentType === "VIDEO") && (
          <div className="flex items-center gap-3">
            {content.contentValue ? (
              <div className="flex-1 flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                {content.contentType === "IMAGE" && (
                  <img
                    src={content.contentValue}
                    alt=""
                    className="size-12 object-cover rounded border border-border"
                  />
                )}
                {content.contentType === "AUDIO" && (
                  <audio src={content.contentValue} controls className="h-8 max-w-full" />
                )}
                {content.contentType === "VIDEO" && (
                  <video
                    src={content.contentValue}
                    controls
                    className="h-16 rounded border border-border"
                  />
                )}
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {content.file?.name ?? content.contentValue.split("/").pop() ?? "Attached"}
                </span>
                <button
                  onClick={() => onChange({ contentValue: "", file: undefined })}
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  title="Remove"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 text-sm px-3 py-2 rounded-md border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              >
                {content.contentType === "IMAGE" && <ImageIcon className="size-4" />}
                {content.contentType === "AUDIO" && <Mic className="size-4" />}
                {content.contentType === "VIDEO" && <Video className="size-4" />}
                Upload {content.contentType.toLowerCase()}
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              className="hidden"
              onChange={handleFile}
            />
          </div>
        )}
      </div>

      <button
        onClick={onRemove}
        disabled={!canRemove}
        className="shrink-0 mt-1.5 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed transition-colors opacity-0 group-hover:opacity-100"
        title="Remove content"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────
   Card type select
───────────────────────────────────────── */
function CardTypeSelect({
  value,
  onChange,
}: {
  value: CardDraft["cardType"];
  onChange: (v: CardDraft["cardType"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = CARD_TYPES.find((t) => t.value === value) ?? CARD_TYPES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border border-border bg-background text-foreground hover:bg-accent transition-colors"
      >
        {active.label}
        <ChevronDown className="size-3" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-9 z-20 w-60 rounded-lg border border-border bg-popover shadow-lg py-1"
            >
              {CARD_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    onChange(t.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors",
                    value === t.value && "bg-accent"
                  )}
                >
                  <p className="font-semibold text-foreground">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.hint}</p>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────────────────────
   Reusable textarea field
───────────────────────────────────────── */
function FieldArea({
  label,
  icon,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={2}
        className="w-full text-sm rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-none"
      />
    </div>
  );
}
