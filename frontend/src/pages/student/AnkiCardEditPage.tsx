import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Image as ImageIcon,
  Loader2,
  Mic,
  Save,
  Square,
  Trash2,
  Type,
  Video,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type {
  FlashcardContentType,
  FlashcardDTO,
  FlashcardSideDTO,
  FlashcardSideType,
} from "@/types";

interface ContentDraft {
  uid: string;
  label?: string;
  contentType: FlashcardContentType;
  contentValue: string;
  file?: File;
}

interface SideDraft {
  side: FlashcardSideType;
  contents: ContentDraft[];
}

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

/**
 * Full-page editor for a single Anki flashcard (front/back/hint contents +
 * hint & explanation). Reached from the Anki study toolbar's "Edit card"
 * action — replaces the former modal so editing gets its own route and
 * the URL is shareable / back-button friendly.
 */
export default function AnkiCardEditPage() {
  const { deckId, flashcardId } = useParams<{
    deckId: string;
    flashcardId: string;
  }>();
  const navigate = useNavigate();
  const backTo = `/deck/${deckId}/anki`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState("");
  const [explanation, setExplanation] = useState("");
  const [sides, setSides] = useState<SideDraft[]>([]);
  const [original, setOriginal] = useState<FlashcardDTO | null>(null);

  /* ── Load on mount ── */
  useEffect(() => {
    if (!flashcardId) return;
    setLoading(true);
    flashcardApi
      .getById(String(flashcardId))
      .then((fc) => {
        setOriginal(fc);
        setHint(fc.hint ?? "");
        setExplanation(fc.explanation ?? "");
        setSides(
          (fc.sides ?? []).map((s) => ({
            side: s.side,
            contents: (s.contents ?? []).map((c) => ({
              uid: crypto.randomUUID(),
              label: c.label,
              contentType: c.contentType,
              contentValue: c.contentValue,
            })),
          }))
        );
      })
      .catch(() => toast.error("Failed to load card."))
      .finally(() => setLoading(false));
  }, [flashcardId]);

  /* ── Mutators ── */
  const addContent = (sideIdx: number, ct: FlashcardContentType) =>
    setSides((p) =>
      p.map((s, i) =>
        i === sideIdx ? { ...s, contents: [...s.contents, makeContent(ct)] } : s
      )
    );

  const updateContent = (sideIdx: number, uid: string, patch: Partial<ContentDraft>) =>
    setSides((p) =>
      p.map((s, i) =>
        i === sideIdx
          ? {
              ...s,
              contents: s.contents.map((c) => (c.uid === uid ? { ...c, ...patch } : c)),
            }
          : s
      )
    );

  const removeContent = (sideIdx: number, uid: string) =>
    setSides((p) =>
      p.map((s, i) =>
        i === sideIdx
          ? { ...s, contents: s.contents.filter((c) => c.uid !== uid) }
          : s
      )
    );

  /* ── Save ── */
  const handleSave = async () => {
    if (!original) return;

    // Validate FRONT/BACK have at least one TEXT/CLOZE
    for (const target of ["FRONT", "BACK"] as const) {
      const s = sides.find((x) => x.side === target);
      if (!s) {
        toast.error(`${target} side is required.`);
        return;
      }
      const hasText = s.contents.some(
        (c) => (c.contentType === "TEXT" || c.contentType === "CLOZE") && c.contentValue.trim()
      );
      if (!hasText) {
        toast.error(`${target} side needs at least one text/cloze content.`);
        return;
      }
    }

    setSaving(true);
    try {
      const builtSides: FlashcardSideDTO[] = [];
      for (const side of sides) {
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
              toast.error(`Failed to upload ${co.contentType.toLowerCase()}.`);
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

      await flashcardApi.update(String(flashcardId), {
        ...original,
        hint: hint.trim() || undefined,
        explanation: explanation.trim() || undefined,
        sides: builtSides,
      });

      toast.success("Card updated.");
      navigate(backTo);
    } catch {
      toast.error("Failed to save card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: backTo, title: "Study" }}
      ignorePaths={["deck", String(deckId), "anki", "card", String(flashcardId)]}
      pathName={{
        [`/deck/${deckId}/anki/card/${flashcardId}/edit`]: "Edit card",
      }}
    >
      <div className="mx-auto w-full max-w-2xl pb-16 pt-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-5 py-3">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => navigate(backTo)}
                className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                title="Back to study"
                aria-label="Back to study"
              >
                <ChevronLeft className="size-4" />
              </button>
              <h1 className="truncate text-base font-bold text-foreground">Edit card</h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                onClick={() => navigate(backTo)}
                disabled={saving}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 py-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {sides.map((side, sideIdx) => (
                  <div
                    key={`${side.side}-${sideIdx}`}
                    className="space-y-3 rounded-lg border border-border bg-background/40 p-4"
                  >
                    <span
                      className={cn(
                        "inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        side.side === "FRONT" &&
                          "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        side.side === "BACK" &&
                          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                        side.side === "HINT" &&
                          "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                      )}
                    >
                      {side.side}
                    </span>

                    <div className="space-y-2">
                      {side.contents.map((co) => (
                        <ContentRow
                          key={co.uid}
                          content={co}
                          onChange={(patch) => updateContent(sideIdx, co.uid, patch)}
                          onRemove={() => removeContent(sideIdx, co.uid)}
                          canRemove={side.contents.length > 1}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Add:
                      </span>
                      {CONTENT_TYPES.map((ct) => (
                        <button
                          key={ct.value}
                          onClick={() => addContent(sideIdx, ct.value)}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                          {ct.icon}
                          {ct.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Hint
                    </label>
                    <textarea
                      value={hint}
                      onChange={(e) => setHint(e.target.value)}
                      placeholder="Optional hint…"
                      rows={2}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Explanation
                    </label>
                    <textarea
                      value={explanation}
                      onChange={(e) => setExplanation(e.target.value)}
                      placeholder="Why is this the answer?…"
                      rows={2}
                      className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
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
