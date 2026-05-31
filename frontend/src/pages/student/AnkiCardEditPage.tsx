import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deckApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Loader2,
  Mic,
  Save,
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
];

const SIDE_BADGE: Record<FlashcardSideType, string> = {
  FRONT: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  BACK: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  HINT: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
};

const makeContent = (
  contentType: FlashcardContentType = "TEXT",
  contentValue = ""
): ContentDraft => ({
  uid: crypto.randomUUID(),
  contentType,
  contentValue,
});

/**
 * Full-page editor for a single flashcard (front/back/hint contents + hint &
 * explanation). Reached from the SRS study toolbar's "Edit card" action.
 *
 * Route + breadcrumb follow the app's edit-page convention
 * (`Home › My Library › <Deck> › Edit card`), matching QuestionFormPage etc.
 */
export default function AnkiCardEditPage() {
  const { deckId, flashcardId } = useParams<{ deckId: string; flashcardId: string }>();
  const navigate = useNavigate();
  const backTo = `/deck/${deckId}`;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [deckTitle, setDeckTitle] = useState("");
  const [sides, setSides] = useState<SideDraft[]>([]);
  const [original, setOriginal] = useState<FlashcardDTO | null>(null);

  /* ── Deck title (for the breadcrumb + back button) ── */
  useEffect(() => {
    if (!deckId) return;
    deckApi
      .getById(deckId)
      .then((d) => setDeckTitle(d.title ?? ""))
      .catch(() => {});
  }, [deckId]);

  /* ── Load card ── */
  useEffect(() => {
    if (!flashcardId) return;
    setLoading(true);
    flashcardApi
      .getById(String(flashcardId))
      .then((fc) => {
        setOriginal(fc);
        setDirty(false);
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

  /* ── Mutators (any change marks the form dirty → enables Save) ── */
  const addContent = (sideIdx: number, ct: FlashcardContentType) => {
    setDirty(true);
    setSides((p) =>
      p.map((s, i) => (i === sideIdx ? { ...s, contents: [...s.contents, makeContent(ct)] } : s))
    );
  };

  const updateContent = (sideIdx: number, uid: string, patch: Partial<ContentDraft>) => {
    setDirty(true);
    setSides((p) =>
      p.map((s, i) =>
        i === sideIdx
          ? { ...s, contents: s.contents.map((c) => (c.uid === uid ? { ...c, ...patch } : c)) }
          : s
      )
    );
  };

  const removeContent = (sideIdx: number, uid: string) => {
    setDirty(true);
    setSides((p) =>
      p.map((s, i) =>
        i === sideIdx ? { ...s, contents: s.contents.filter((c) => c.uid !== uid) } : s
      )
    );
  };

  /* ── Save ── */
  const handleSave = async () => {
    if (!original) return;

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
            (co.contentType === "IMAGE" || co.contentType === "AUDIO" || co.contentType === "VIDEO") &&
            co.file
          ) {
            try {
              const fieldName =
                co.contentType === "IMAGE" ? "imageUrl" : co.contentType === "AUDIO" ? "audioUrl" : "videoUrl";
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
      parentCrumb={{ href: "/library", title: "My Library" }}
      ignorePaths={["deck", "card", String(flashcardId)]}
      pathName={{
        [`/deck/${deckId}`]: deckTitle || "Deck",
        [`/deck/${deckId}/card/${flashcardId}/edit`]: "Edit card",
      }}
    >
      <div className="flex h-full min-h-0 w-full flex-col gap-4 py-2">
        {/* Actions — top right. Save stays disabled until something changes. */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(backTo)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save
          </Button>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-4 sm:grid-cols-2">
            {(["FRONT", "BACK"] as const).map((target) => {
              const sideIdx = sides.findIndex((s) => s.side === target);
              if (sideIdx < 0) return null;
              const side = sides[sideIdx];
              return (
                <section
                  key={target}
                  className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                >
                  {/* Header */}
                  <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-2.5">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
                        SIDE_BADGE[side.side]
                      )}
                    >
                      {side.side === "FRONT" ? "Mặt trước" : side.side === "BACK" ? "Mặt sau" : side.side}
                    </span>
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {side.contents.length} mục
                    </span>
                  </div>

                  {/* Body — scrolls when content is long */}
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                    {side.contents.length === 0 ? (
                      <p className="py-6 text-center text-xs text-muted-foreground/70">
                        Chưa có nội dung. Thêm bằng các nút bên dưới.
                      </p>
                    ) : (
                      side.contents.map((co) => (
                        <ContentRow
                          key={co.uid}
                          content={co}
                          onChange={(patch) => updateContent(sideIdx, co.uid, patch)}
                          onRemove={() => removeContent(sideIdx, co.uid)}
                          canRemove={side.contents.length > 1}
                        />
                      ))
                    )}
                  </div>

                  {/* Footer — add content */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border bg-muted/20 px-4 py-2.5">
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Add</span>
                    {CONTENT_TYPES.map((ct) => (
                      <Button
                        key={ct.value}
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={() => addContent(sideIdx, ct.value)}
                      >
                        {ct.icon}
                        {ct.label}
                      </Button>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
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

  const typeIcon = CONTENT_TYPES.find((t) => t.value === content.contentType)?.icon ?? null;
  const isMedia =
    content.contentType === "IMAGE" || content.contentType === "AUDIO" || content.contentType === "VIDEO";

  return (
    <div className="group flex items-start gap-2">
      <div className="mt-2 shrink-0 text-muted-foreground" title={content.contentType}>
        {typeIcon}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <Input
          value={content.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label (optional, e.g. Example, Reading…)"
          className="h-8 text-xs"
        />

        {(content.contentType === "TEXT" || content.contentType === "CLOZE") && (
          <Textarea
            value={content.contentValue}
            onChange={(e) => onChange({ contentValue: e.target.value })}
            placeholder={
              content.contentType === "CLOZE" ? "Use {{c1::answer}} to mark a cloze deletion…" : "Enter text…"
            }
            rows={2}
            className="resize-none"
          />
        )}

        {isMedia && (
          <div className="flex items-center gap-3">
            {content.contentValue ? (
              <div className="flex flex-1 items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
                {content.contentType === "IMAGE" && (
                  <img src={content.contentValue} alt="" className="size-12 rounded border border-border object-cover" />
                )}
                {content.contentType === "AUDIO" && (
                  <audio src={content.contentValue} controls className="h-8 max-w-full" />
                )}
                {content.contentType === "VIDEO" && (
                  <video src={content.contentValue} controls className="h-16 rounded border border-border" />
                )}
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {content.file?.name ?? content.contentValue.split("/").pop() ?? "Attached"}
                </span>
                <button
                  onClick={() => onChange({ contentValue: "", file: undefined })}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-dashed"
                onClick={() => fileInputRef.current?.click()}
              >
                {content.contentType === "IMAGE" && <ImageIcon className="size-4" />}
                {content.contentType === "AUDIO" && <Mic className="size-4" />}
                {content.contentType === "VIDEO" && <Video className="size-4" />}
                Upload {content.contentType.toLowerCase()}
              </Button>
            )}

            <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={!canRemove}
        title="Remove content"
        className="mt-1 size-8 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-20"
      >
        <Trash2 className="size-3.5" />
      </Button>
    </div>
  );
}
