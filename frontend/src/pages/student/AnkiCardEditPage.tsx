import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deckApi, flashcardApi } from "@/api";
import { fileApi } from "@/api/features/file.api";
import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Image as ImageIcon,
  Loader2,
  Mic,
  Save,
  SquarePen,
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
  { value: "TEXT", label: "Văn bản", icon: <Type className="size-3.5" /> },
  { value: "IMAGE", label: "Hình ảnh", icon: <ImageIcon className="size-3.5" /> },
  { value: "AUDIO", label: "Âm thanh", icon: <Mic className="size-3.5" /> },
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
      .catch(() => toast.error("Không thể tải thẻ."))
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
      const targetLabel = target === "FRONT" ? "Mặt trước" : "Mặt sau";
      if (!s) {
        toast.error(`${targetLabel} là bắt buộc.`);
        return;
      }
      const hasText = s.contents.some(
        (c) => (c.contentType === "TEXT" || c.contentType === "CLOZE") && c.contentValue.trim()
      );
      if (!hasText) {
        toast.error(`${targetLabel} cần ít nhất một nội dung văn bản/cloze.`);
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
              toast.error(`Tải lên ${co.contentType.toLowerCase()} thất bại.`);
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

      toast.success("Đã cập nhật thẻ.");
      navigate(backTo);
    } catch {
      toast.error("Không thể lưu thẻ.");
    } finally {
      setSaving(false);
    }
  };

  // Save is only allowed when BOTH sides carry at least one non-empty
  // text/cloze content — a card needs a front and a back to be studyable.
  const sideHasContent = (s: SideDraft | undefined) =>
    !!s &&
    s.contents.some(
      (c) => (c.contentType === "TEXT" || c.contentType === "CLOZE") && c.contentValue.trim().length > 0
    );
  const bothSidesFilled =
    sideHasContent(sides.find((s) => s.side === "FRONT")) &&
    sideHasContent(sides.find((s) => s.side === "BACK"));

  return (
    <MainLayout
      parentCrumb={{ href: "/library", title: "Thư viện của tôi" }}
      breadcrumbIcon={<SquarePen className="size-4 text-primary" />}
      ignorePaths={["deck", "card", String(flashcardId)]}
      pathName={{
        [`/deck/${deckId}`]: deckTitle || "Bộ thẻ",
        [`/deck/${deckId}/card/${flashcardId}/edit`]: "Sửa thẻ",
      }}
      pageScroll
    >
      <div className="flex h-full min-h-0 w-full flex-col gap-4 py-2">
        {/* Actions — top right. Save stays disabled until something changes. */}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <Button variant="outline" onClick={() => navigate(backTo)} disabled={saving}>
            Huỷ
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty || !bothSidesFilled}
            title={!bothSidesFilled ? "Cả mặt trước và mặt sau đều cần có nội dung" : undefined}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu
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
                  className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm"
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

                  {/* Body — scrolls (with hint arrows) when content is long */}
                  <ScrollHintContainer axis="vertical" className="min-h-0 flex-1" viewportClassName="space-y-2 p-4">
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
                  </ScrollHintContainer>

                  {/* Footer — add content */}
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border bg-muted/20 px-4 py-2.5">
                    <span className="mr-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Thêm
                    </span>
                    {CONTENT_TYPES.map((ct) => (
                      <Button
                        key={ct.value}
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 px-2.5 text-[11px]"
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

  const typeMeta = CONTENT_TYPES.find((t) => t.value === content.contentType);
  const isMedia =
    content.contentType === "IMAGE" || content.contentType === "AUDIO" || content.contentType === "VIDEO";

  return (
    <div className="space-y-2 rounded-md border border-border bg-background/50 p-2.5">
      {/* Row header: type chip + remove */}
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
          {typeMeta?.icon}
          {typeMeta?.label ?? content.contentType}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          title="Xoá nội dung"
          className="size-7 text-muted-foreground hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Input
        value={content.label ?? ""}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Nhãn (tuỳ chọn — vd: Ví dụ, Cách đọc…)"
        className="h-8 text-xs"
      />

      {(content.contentType === "TEXT" || content.contentType === "CLOZE") && (
        <Textarea
          value={content.contentValue}
          onChange={(e) => onChange({ contentValue: e.target.value })}
          placeholder={
            content.contentType === "CLOZE" ? "Dùng {{c1::đáp án}} để tạo cloze…" : "Nhập nội dung…"
          }
          rows={2}
          className="resize-none"
        />
      )}

      {isMedia &&
        (content.contentValue ? (
          <div className="flex items-center gap-3 rounded-md border border-input bg-background px-3 py-2">
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
              {content.file?.name ?? content.contentValue.split("/").pop() ?? "Đã đính kèm"}
            </span>
            <button
              onClick={() => onChange({ contentValue: "", file: undefined })}
              className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
              title="Xoá tệp"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 border-dashed"
            onClick={() => fileInputRef.current?.click()}
          >
            {content.contentType === "IMAGE" && <ImageIcon className="size-4" />}
            {content.contentType === "AUDIO" && <Mic className="size-4" />}
            {content.contentType === "VIDEO" && <Video className="size-4" />}
            Tải lên {content.contentType === "IMAGE" ? "hình ảnh" : content.contentType === "AUDIO" ? "âm thanh" : "video"}
          </Button>
        ))}

      {isMedia && <input ref={fileInputRef} type="file" accept={accept} className="hidden" onChange={handleFile} />}
    </div>
  );
}
