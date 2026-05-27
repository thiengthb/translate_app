import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { deckApi, deckItemApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Globe,
  GripVertical,
  Image as ImageIcon,
  Lock,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getCurrentUserId } from "@/utils/auth.utils";
import type { FlashcardSideDTO } from "@/types";

/* ─── Types ─── */
interface CardDraft {
  uid: string;
  front: string;
  back: string;
  imageFile?: File;
  imagePreview?: string;
}

const makeCard = (): CardDraft => ({
  uid: crypto.randomUUID(),
  front: "",
  back: "",
});

/* ─────────────────────────────────────────
   Quizlet create page
───────────────────────────────────────── */
export default function CreateQuizletDeckPage() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [cards, setCards] = useState<CardDraft[]>([makeCard(), makeCard()]);
  const [submitting, setSubmitting] = useState(false);

  /* ── Card helpers ── */
  const addCard = () => setCards((p) => [...p, makeCard()]);
  const removeCard = (uid: string) => setCards((p) => p.filter((c) => c.uid !== uid));
  const updateCard = (uid: string, field: "front" | "back", value: string) =>
    setCards((p) => p.map((c) => (c.uid === uid ? { ...c, [field]: value } : c)));
  const setCardImage = (uid: string, file: File, preview: string) =>
    setCards((p) =>
      p.map((c) => (c.uid === uid ? { ...c, imageFile: file, imagePreview: preview } : c))
    );
  const clearCardImage = (uid: string) =>
    setCards((p) =>
      p.map((c) => (c.uid === uid ? { ...c, imageFile: undefined, imagePreview: undefined } : c))
    );

  /* ── Submit ── */
  const handleCreate = async (practice = false) => {
    if (!title.trim()) {
      toast.error("Please enter a deck title.");
      return;
    }
    const valid = cards.filter((c) => c.front.trim() || c.back.trim());
    if (valid.length === 0) {
      toast.error("Add at least one card.");
      return;
    }

    const userId = getCurrentUserId();
    setSubmitting(true);
    try {
      const deck = await deckApi.create({
        userId,
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        studyMode: "QUIZLET",
        totalCards: valid.length,
        isActive: true,
      });

      for (const [i, card] of valid.entries()) {
        const sides: FlashcardSideDTO[] = [
          {
            side: "FRONT",
            contents: [
              {
                contentType: "TEXT",
                contentValue: card.front.trim() || "(empty)",
                orderIndex: 0,
              },
            ],
          },
          {
            side: "BACK",
            contents: [
              {
                contentType: "TEXT",
                contentValue: card.back.trim() || "(empty)",
                orderIndex: 0,
              },
            ],
          },
        ];

        const fc = await flashcardApi.create({
          cardType: "BASIC",
          itemType: "WORD",
          itemId: 0,
          isActive: true,
          sides,
        });

        if (card.imageFile && fc.id) {
          try {
            const attachment = await fileApi.upload(
              card.imageFile,
              "flashcard",
              fc.id,
              "imageUrl"
            );
            // Append image content to the FRONT side via a follow-up update.
            await flashcardApi.update(String(fc.id), {
              sides: [
                {
                  side: "FRONT",
                  contents: [
                    {
                      contentType: "TEXT",
                      contentValue: card.front.trim() || "(empty)",
                      orderIndex: 0,
                    },
                    {
                      contentType: "IMAGE",
                      contentValue: attachment.url,
                      orderIndex: 1,
                    },
                  ],
                },
                {
                  side: "BACK",
                  contents: [
                    {
                      contentType: "TEXT",
                      contentValue: card.back.trim() || "(empty)",
                      orderIndex: 0,
                    },
                  ],
                },
              ],
            });
          } catch {
            // image upload failed — continue without image
          }
        }

        await deckItemApi.create({
          deckId: deck.id,
          flashcardId: fc.id,
          orderIndex: i,
          isActive: true,
        });
      }

      toast.success("Deck created successfully!");
      navigate(practice && deck.id ? `/deck/${deck.id}` : "/library");
    } catch {
      toast.error("Failed to create deck. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout pathName={{ "/create-deck/quizlet": "Quizlet deck" }}>
      <div className="max-w-4xl mx-auto w-full pb-32 space-y-5">
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
          <div className="size-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Create a Quizlet deck
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Classic flip cards · one front, one back, optional image
            </p>
          </div>
        </div>

        {/* Title / description */}
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
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
              Choose who can see this flashcard set
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <VisibilityCard
              active={visibility === "PUBLIC"}
              onClick={() => setVisibility("PUBLIC")}
              icon={<Globe className="size-4" />}
              title="Public"
              description="Anyone can find and study this set"
            />
            <VisibilityCard
              active={visibility === "PRIVATE"}
              onClick={() => setVisibility("PRIVATE")}
              icon={<Lock className="size-4" />}
              title="Private"
              description="Only you can see and study this set"
            />
          </div>
        </div>

        {/* Cards */}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {cards.map((card, i) => (
              <motion.li
                key={card.uid}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                <CardEditor
                  index={i + 1}
                  front={card.front}
                  back={card.back}
                  imagePreview={card.imagePreview}
                  canDelete={cards.length > 1}
                  onChangeFront={(v) => updateCard(card.uid, "front", v)}
                  onChangeBack={(v) => updateCard(card.uid, "back", v)}
                  onImageSelect={(file, preview) => setCardImage(card.uid, file, preview)}
                  onImageClear={() => clearCardImage(card.uid)}
                  onDelete={() => removeCard(card.uid)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>

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
            {cards.filter((c) => c.front.trim() || c.back.trim()).length} card
            {cards.filter((c) => c.front.trim() || c.back.trim()).length !== 1 ? "s" : ""} ready
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
            Save and practice
          </button>
        </div>
      </div>
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Visibility card
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
   Card editor
───────────────────────────────────────── */
function CardEditor({
  index,
  front,
  back,
  imagePreview,
  canDelete,
  onChangeFront,
  onChangeBack,
  onImageSelect,
  onImageClear,
  onDelete,
}: {
  index: number;
  front: string;
  back: string;
  imagePreview?: string;
  canDelete: boolean;
  onChangeFront: (v: string) => void;
  onChangeBack: (v: string) => void;
  onImageSelect: (file: File, preview: string) => void;
  onImageClear: () => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    const preview = URL.createObjectURL(file);
    onImageSelect(file, preview);
    e.target.value = "";
  };

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden group">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-border bg-muted/40">
        <span className="text-sm font-bold text-foreground">{index}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-grab"
            title="Drag to reorder"
          >
            <GripVertical className="size-4" />
          </button>
          <button
            onClick={onDelete}
            disabled={!canDelete}
            className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Delete card"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex items-stretch px-5 pb-5 pt-4 gap-0">
        <TermField value={front} onChange={onChangeFront} placeholder="Enter term" label="Term" />

        <div className="w-px bg-border mx-6 self-stretch" />

        <TermField
          value={back}
          onChange={onChangeBack}
          placeholder="Enter definition"
          label="Definition"
        />

        <div className="w-px bg-border mx-6 self-stretch" />

        <div className="shrink-0 self-center">
          {imagePreview ? (
            <div className="relative w-24 h-16">
              <img
                src={imagePreview}
                alt="Card image"
                className="w-24 h-16 rounded-xl object-cover border border-border"
              />
              <button
                onClick={onImageClear}
                className="absolute -top-2 -right-2 size-5 rounded-full bg-destructive text-white flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors"
                title="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-16 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-foreground/30 hover:text-foreground hover:bg-accent transition-colors"
              title="Add image"
            >
              <ImageIcon className="size-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">Image</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </div>
  );
}

function TermField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col justify-end">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-foreground font-semibold text-sm placeholder:text-muted-foreground/60 focus:outline-none pb-1.5 border-b-2 border-border focus:border-primary transition-colors"
      />
      <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
        {label}
      </p>
    </div>
  );
}
