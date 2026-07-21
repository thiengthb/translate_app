import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { flashcardTemplateApi } from "@/api";
import { MainLayout } from "@/components/layout/MainLayout";
import { cn } from "@/lib/utils";
import { getCurrentUserId } from "@/utils/auth.utils";
import { templatePreviewSrcDoc } from "@/features/card-template-designer/templatePreview";
import { EmptyState } from "@/components/common/EmptyState";
import type { TemplateSide } from "@/features/card-template-designer/types";
import type { FlashcardTemplateDTO } from "@/types";
import { Globe, GraduationCap, Layers, Loader2, Lock, Maximize2, Minimize2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";

/**
 * Full-page template preview — opened by clicking a template card. Renders the
 * template like a study card with a Front/Back switch and a deck-style control
 * bar, plus a "Sử dụng" action (and share / edit for the owner).
 */
export default function CardTemplatePreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();

  const [loading, setLoading] = useState(true);
  const [tpl, setTpl] = useState<FlashcardTemplateDTO | null>(null);
  const [side, setSide] = useState<TemplateSide>("FRONT");
  const [savingVis, setSavingVis] = useState(false);
  const [fullView, setFullView] = useState(false);
  const flip = () => setSide((s) => (s === "FRONT" ? "BACK" : "FRONT"));

  // Full view: lock body scroll + Esc to exit.
  useEffect(() => {
    if (!fullView) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFullView(false); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullView]);

  useEffect(() => {
    if (!templateId) return;
    let cancelled = false;
    setLoading(true);
    flashcardTemplateApi
      .getById(templateId)
      .then((t) => !cancelled && setTpl(t))
      .catch(() => !cancelled && toast.error("Không tải được mẫu thẻ."))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [templateId]);

  const srcDoc = useMemo(() => (tpl ? templatePreviewSrcDoc(tpl, side) : ""), [tpl, side]);
  const isOwner = !!tpl && !tpl.isSystem && tpl.userId === currentUserId;
  const isPublic = tpl?.visibility === "PUBLIC";

  const toggleVisibility = async () => {
    if (!tpl?.id) return;
    const next = isPublic ? "PRIVATE" : "PUBLIC";
    setSavingVis(true);
    try {
      const updated = await flashcardTemplateApi.update(String(tpl.id), { ...tpl, visibility: next });
      setTpl(updated);
      toast.success(next === "PUBLIC" ? "Đã công khai mẫu thẻ." : "Đã chuyển về riêng tư.");
    } catch {
      toast.error("Không thể đổi trạng thái chia sẻ.");
    } finally {
      setSavingVis(false);
    }
  };

  return (
    <MainLayout
      parentCrumb={{ href: "/library?tab=template", title: "Mẫu thẻ" }}
      ignorePaths={["card-templates", String(templateId ?? "")]}
      pathName={{ [`/card-templates/${templateId}/preview`]: tpl?.name || "Xem trước" }}
      pageScroll
    >
      {loading ? (
        <div className="flex flex-1 min-h-0 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !tpl ? (
        <EmptyState className="flex-1 min-h-0" icon={<Layers className="size-7" />} title="Không tìm thấy mẫu thẻ." />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 py-2">
          {/* ── Control bar: full view (left) · actions (right) ── */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setFullView(true)}
              className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Xem toàn màn hình"
            >
              <Maximize2 className="size-4" />
              Toàn màn hình
            </button>

            <div className="flex items-center gap-2">
              {isOwner && (
                <>
                  <button
                    onClick={toggleVisibility}
                    disabled={savingVis}
                    className={cn(
                      "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-all disabled:opacity-50",
                      isPublic
                        ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                        : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                    title={isPublic ? "Đang công khai — bấm để chuyển riêng tư" : "Đang riêng tư — bấm để chia sẻ"}
                  >
                    {savingVis ? <Loader2 className="size-4 animate-spin" /> : isPublic ? <Globe className="size-4" /> : <Lock className="size-4" />}
                    {isPublic ? "Công khai" : "Riêng tư"}
                  </button>
                  <button
                    onClick={() => navigate(`/card-templates/${tpl.id}/edit`)}
                    className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="Chỉnh sửa mẫu"
                  >
                    <Pencil className="size-4" />
                  </button>
                </>
              )}
              <button
                onClick={() => navigate(`/create-deck?template=${tpl.id}`)}
                className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <GraduationCap className="size-4" />
                Sử dụng
              </button>
            </div>
          </div>


          {/* ── Card surface — click to flip (same effect as SRS review) ── */}
          <div
            className="relative flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
            onClick={flip}
            title="Bấm để lật"
            style={{ perspective: 1400 }}
          >
            <span className="pointer-events-none absolute left-1/2 top-2 z-10 -translate-x-1/2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {side === "FRONT" ? "Mặt trước" : "Mặt sau"}
            </span>
            <AnimatePresence mode="wait">
              <motion.div
                key={side}
                initial={{ opacity: 0, scale: 0.9, y: 28, z: -160 }}
                animate={{ opacity: 1, scale: 1, y: 0, z: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -28, z: -160 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                className="flex min-h-0 flex-1"
              >
                <iframe title="template-preview" srcDoc={srcDoc} className="pointer-events-none h-full min-h-[50vh] w-full" sandbox="" />
              </motion.div>
            </AnimatePresence>
            <div className="pointer-events-none absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 text-[11px] text-muted-foreground/70">
              <RefreshCw className="size-3" />
              Bấm để lật mặt
            </div>
          </div>
        </div>
      )}

      {/* ── Full view — chromeless overlay, click to flip ── */}
      {fullView && tpl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background p-3 sm:p-4">
          <div className="flex shrink-0 items-center justify-between pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {side === "FRONT" ? "Mặt trước" : "Mặt sau"}
            </span>
            <button
              onClick={() => setFullView(false)}
              title="Thoát toàn màn hình (Esc)"
              className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Minimize2 className="size-4" />
            </button>
          </div>
          <div
            className="relative flex min-h-0 flex-1 cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card"
            onClick={flip}
            title="Bấm để lật"
            style={{ perspective: 1400 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={side}
                initial={{ opacity: 0, scale: 0.9, y: 28, z: -160 }}
                animate={{ opacity: 1, scale: 1, y: 0, z: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -28, z: -160 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ transformStyle: "preserve-3d" }}
                className="flex min-h-0 flex-1"
              >
                <iframe title="template-preview-full" srcDoc={srcDoc} className="pointer-events-none h-full w-full" sandbox="" />
              </motion.div>
            </AnimatePresence>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 text-[11px] text-muted-foreground/70">
              <RefreshCw className="size-3" />
              Bấm để lật mặt
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
