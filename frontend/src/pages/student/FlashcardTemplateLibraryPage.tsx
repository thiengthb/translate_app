import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { flashcardTemplateApi } from "@/api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getCurrentUserId } from "@/utils/auth.utils";
import { templatePreviewSrcDoc } from "@/features/card-template-designer/templatePreview";
import type { TemplateSide } from "@/features/card-template-designer/types";
import type { FlashcardTemplateDTO } from "@/types";
import { GraduationCap, Layers, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";

/**
 * "Card templates" — the user's reusable template library, surfaced as a base
 * CRUD entity (backend `@AutoCrud` + `@ResourceMenu` on FlashcardTemplate).
 * Unlike the generic ProTable, each template is shown as a LIVE PREVIEW card
 * (front/back) so authors can recognise a template at a glance, then reuse it
 * for a new deck or delete it.
 */
export default function FlashcardTemplateLibraryPage() {
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<FlashcardTemplateDTO[]>([]);

  const load = useCallback(() => {
    setLoading(true);
    flashcardTemplateApi
      .listForUser(currentUserId ?? undefined)
      .then((list) => setTemplates(list))
      .catch((err) => {
        logger.warn("Failed to load templates", err);
        toast.error("Không tải được danh sách mẫu thẻ.");
      })
      .finally(() => setLoading(false));
  }, [currentUserId]);

  useEffect(() => { load(); }, [load]);

  // Owned templates first, then system templates.
  const sorted = useMemo(
    () =>
      [...templates].sort((a, b) => {
        const sa = a.isSystem ? 1 : 0;
        const sb = b.isSystem ? 1 : 0;
        return sa - sb;
      }),
    [templates]
  );

  const handleDelete = async (tpl: FlashcardTemplateDTO) => {
    if (tpl.id == null) return;
    try {
      await flashcardTemplateApi.deleteTemplate(tpl.id);
      setTemplates((prev) => prev.filter((t) => t.id !== tpl.id));
      toast.success("Đã xóa mẫu thẻ.");
    } catch {
      toast.error("Xóa mẫu thẻ thất bại.");
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: "/library", title: "My Library" }}
      pathName={{ "/card-templates": "Mẫu thẻ" }}
    >
      <div className="w-full space-y-4 pb-10 pt-1">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="size-4.5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground">Mẫu thẻ</h1>
              <p className="text-xs text-muted-foreground">Thư viện mẫu hiển thị dùng lại cho các deck</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/create-deck")}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Tạo deck
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Layers className="size-6" />
            </div>
            <div>
              <p className="font-medium text-foreground">Chưa có mẫu thẻ nào</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Mẫu thẻ được tự tạo khi bạn tạo deck — sau đó hiện ở đây để xem trước và dùng lại.
              </p>
            </div>
            <button
              onClick={() => navigate("/create-deck")}
              className="mt-1 flex h-9 items-center gap-1.5 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Plus className="size-4" />
              Tạo deck đầu tiên
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((tpl) => (
              <TemplateCard
                key={tpl.id}
                tpl={tpl}
                owned={!tpl.isSystem && tpl.userId === currentUserId}
                onUse={() => navigate(`/create-deck?template=${tpl.id}`)}
                onDelete={() => handleDelete(tpl)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}

/* ─────────────────────────── Template preview card ─────────────────────────── */

function TemplateCard({
  tpl,
  owned,
  onUse,
  onDelete,
}: {
  tpl: FlashcardTemplateDTO;
  owned: boolean;
  onUse: () => void;
  onDelete: () => void;
}) {
  const [side, setSide] = useState<TemplateSide>("FRONT");
  const [confirming, setConfirming] = useState(false);
  const srcDoc = useMemo(() => templatePreviewSrcDoc(tpl, side), [tpl, side]);

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Title row */}
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{tpl.name || "Mẫu thẻ"}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            {tpl.cardType && (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{tpl.cardType}</span>
            )}
            {tpl.isSystem && (
              <span className="flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                <Sparkles className="size-3" />
                Hệ thống
              </span>
            )}
          </div>
        </div>
        {/* Front/Back toggle */}
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border p-0.5">
          {(["FRONT", "BACK"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                side === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s === "FRONT" ? "Trước" : "Sau"}
            </button>
          ))}
        </div>
      </div>

      {/* Live preview */}
      <div className="relative h-44 bg-muted/30">
        <iframe title={`preview-${tpl.id}-${side}`} srcDoc={srcDoc} className="h-full w-full" sandbox="" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2.5">
        <button
          onClick={onUse}
          className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <GraduationCap className="size-3.5" />
          Dùng mẫu này
        </button>
        {owned &&
          (confirming ? (
            <div className="flex items-center gap-1">
              <button onClick={onDelete} className="h-8 rounded-lg bg-destructive px-2.5 text-xs font-semibold text-white transition-colors hover:bg-destructive/90">
                Xóa?
              </button>
              <button onClick={() => setConfirming(false)} className="h-8 rounded-lg border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:bg-accent">
                Hủy
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              title="Xóa mẫu thẻ"
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-destructive"
            >
              <Trash2 className="size-4" />
            </button>
          ))}
      </div>
    </div>
  );
}
