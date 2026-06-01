import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFillPageSize } from "@/hooks/useFillPageSize";
import { DataPagination } from "@/components/common/DataPagination";
import { AnimatePresence, motion } from "motion/react";
import { flashcardTemplateApi } from "@/api";
import type { FlashcardTemplateDTO } from "@/types";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import { getCurrentUserId } from "@/utils/auth.utils";
import { parseBuilderConfig } from "@/features/card-template-designer/template-generation";
import { EmptyState } from "@/components/common/EmptyState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Globe,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { LibrarySortMenu, type LibrarySortOption } from "@/pages/student/shared/LibrarySortMenu";
import ActionButton from "@/components/datatable/common/ActionButton";

type ViewMode = "grid" | "list";

/* ── Template sort ("filter") options — backed by real template fields ── */
type TemplateSortKey = "newest" | "recent" | "name" | "oldest";

const TEMPLATE_SORT_OPTIONS: LibrarySortOption<TemplateSortKey>[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "recent", label: "Truy cập gần đây" },
  { value: "name", label: "Tên (A → Z)" },
  { value: "oldest", label: "Cũ nhất" },
];

function compareTemplates(a: FlashcardTemplateDTO, b: FlashcardTemplateDTO, key: TemplateSortKey): number {
  switch (key) {
    case "oldest": return (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
    case "recent": return (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    case "name":   return (a.name ?? "").localeCompare(b.name ?? "");
    case "newest":
    default:       return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  }
}

function fieldCount(tpl: FlashcardTemplateDTO): number {
  const state = parseBuilderConfig(tpl.builderConfigJson);
  if (!state) return 0;
  return (state.sides.FRONT?.length ?? 0) + (state.sides.BACK?.length ?? 0);
}

interface Props {
  /** "owned" = the user's own templates; "shared" = public community templates. */
  mode: "owned" | "shared";
}

/**
 * Template library tab — mirrors the deck library (grid / list toggle + search
 * toolbar). Clicking a template opens its full preview page; managing actions
 * (edit / share / delete) live in the card menu for owned templates.
 */
export function TemplateLibrary({ mode }: Props) {
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<FlashcardTemplateDTO[]>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (localStorage.getItem("templateViewMode") as ViewMode) ?? "grid"; } catch { return "grid"; }
  });
  const changeViewMode = (m: ViewMode) => {
    setViewMode(m);
    try { localStorage.setItem("templateViewMode", m); } catch { /* ignore */ }
  };
  const nextViewMode: ViewMode = viewMode === "grid" ? "list" : "grid";
  const [sortBy, setSortBy] = useState<TemplateSortKey>(() => {
    try { return (localStorage.getItem("templateSortBy") as TemplateSortKey) ?? "newest"; } catch { return "newest"; }
  });
  const changeSortBy = (key: TemplateSortKey) => {
    setSortBy(key);
    try { localStorage.setItem("templateSortBy", key); } catch { /* ignore */ }
  };

  const load = useCallback(() => {
    setLoading(true);
    const req = mode === "shared" ? flashcardTemplateApi.listPublic() : flashcardTemplateApi.listForUser(currentUserId ?? undefined);
    req
      .then(setTemplates)
      .catch((err) => {
        logger.warn("Failed to load templates", err);
        toast.error("Không tải được danh sách mẫu thẻ.");
      })
      .finally(() => setLoading(false));
  }, [mode, currentUserId]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates
      // Deck-local copies (deckId != null) are private overrides — never listed.
      .filter((t) => t.deckId == null)
      .filter((t) => (mode === "shared" ? t.visibility === "PUBLIC" : !t.isSystem && t.userId === currentUserId))
      .filter((t) => !q || (t.name ?? "").toLowerCase().includes(q));
  }, [templates, mode, currentUserId, search]);

  // Sort ("filter") applied on top of the search/visibility filter.
  const sorted = useMemo(
    () => [...visible].sort((a, b) => compareTemplates(a, b, sortBy)),
    [visible, sortBy]
  );

  /* Pagination — page size fills the viewport (same as the deck library). */
  const [page, setPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);
  const perPage = useFillPageSize(gridRef, [viewMode, sorted.length > 0]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = useMemo(
    () => sorted.slice((safePage - 1) * perPage, safePage * perPage),
    [sorted, safePage, perPage]
  );
  useEffect(() => { setPage(1); }, [search, mode, sortBy]);

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

  const handleToggleVisibility = async (tpl: FlashcardTemplateDTO) => {
    if (tpl.id == null) return;
    const next = tpl.visibility === "PUBLIC" ? "PRIVATE" : "PUBLIC";
    try {
      const updated = await flashcardTemplateApi.update(String(tpl.id), { ...tpl, visibility: next });
      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? updated : t)));
      toast.success(next === "PUBLIC" ? "Đã công khai mẫu thẻ." : "Đã chuyển về riêng tư.");
    } catch {
      toast.error("Không thể đổi trạng thái chia sẻ.");
    }
  };

  const cardActions = (tpl: FlashcardTemplateDTO) => ({
    onPreview: () => navigate(`/card-templates/${tpl.id}/preview`),
    onEdit: () => navigate(`/card-templates/${tpl.id}/edit`),
    onToggleVisibility: () => handleToggleVisibility(tpl),
    onDelete: () => handleDelete(tpl),
  });

  return (
    <div className="flex w-full flex-1 flex-col overflow-hidden">
      {/* Toolbar — sort · view toggle · search · create (owned) */}
      <div className="flex items-center gap-2 px-1 pt-2 pb-3 shrink-0">
        <div className="flex-1" />

        {/* Sort ("filter") */}
        <LibrarySortMenu value={sortBy} options={TEMPLATE_SORT_OPTIONS} onChange={changeSortBy} />

        {/* View mode toggle */}
        <TooltipWrapper content={`Chuyển sang dạng ${nextViewMode === "grid" ? "lưới" : "danh sách"}`}>
          <button
            onClick={() => changeViewMode(nextViewMode)}
            aria-label="Đổi kiểu hiển thị"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={nextViewMode} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.12 }}>
                {nextViewMode === "grid" ? <LayoutGrid className="size-4" /> : <List className="size-4" />}
              </motion.span>
            </AnimatePresence>
          </button>
        </TooltipWrapper>

        {/* Search */}
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm mẫu thẻ…"
            className="h-9 w-44 rounded-lg border border-input bg-background pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 sm:w-52"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Create — icon-only, like ProTable */}
        {mode === "owned" && (
          <ActionButton
            onClick={() => navigate("/card-templates/new")}
            tooltip="Tạo mẫu thẻ mới"
            variant="default"
            icon={<Plus size={16} />}
          />
        )}
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-3">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : visible.length === 0 ? (
          search ? (
            <EmptyState
              className="h-64"
              icon={<Search className="size-7" />}
              title="Không tìm thấy mẫu"
              description={`Không có mẫu thẻ nào khớp với “${search}”.`}
              action={{ label: "Xóa tìm kiếm", icon: <X className="size-4" />, onClick: () => setSearch("") }}
            />
          ) : (
            <EmptyState
              className="h-64"
              icon={<Layers className="size-7" />}
              title={mode === "shared" ? "Chưa có mẫu chia sẻ" : "Chưa có mẫu thẻ nào"}
              description={
                mode === "shared"
                  ? "Các mẫu được công khai sẽ hiện ở đây để mọi người dùng lại."
                  : "Mẫu thẻ được tự tạo khi bạn tạo deck, hoặc bấm “Tạo mẫu”."
              }
              action={
                mode === "owned"
                  ? { label: "Tạo mẫu đầu tiên", icon: <Plus className="size-4" />, onClick: () => navigate("/card-templates/new") }
                  : undefined
              }
            />
          )
        ) : viewMode === "list" ? (
          <div ref={gridRef} className="grid grid-cols-1 gap-2 py-2 md:grid-cols-2 lg:grid-cols-3">
            {paged.map((tpl) => (
              <div key={tpl.id}>
                <TemplateRow tpl={tpl} owned={mode === "owned"} {...cardActions(tpl)} />
              </div>
            ))}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {paged.map((tpl) => (
              <TemplateCard key={tpl.id} tpl={tpl} owned={mode === "owned"} {...cardActions(tpl)} />
            ))}
          </div>
        )}
      </div>

      {/* Footer — total + pagination */}
      {!loading && visible.length > 0 && (
        <div className="flex min-h-[44px] shrink-0 items-center justify-between border-t border-border bg-background px-2 py-1.5">
          <span className="text-xs tabular-nums text-muted-foreground">
            Tổng: <span className="font-semibold text-foreground">{visible.length}</span>
          </span>
          <DataPagination currentPage={safePage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}

/* ─────────── shared menu for owned templates ─────────── */
function OwnedMenu({
  tpl,
  onPreview,
  onEdit,
  onToggleVisibility,
  onDelete,
  trigger,
}: {
  tpl: FlashcardTemplateDTO;
  onPreview: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  trigger: React.ReactNode;
}) {
  const isPublic = tpl.visibility === "PUBLIC";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem className="gap-2" onClick={onPreview}>
          <Eye className="size-4 text-muted-foreground" /> Xem trước
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={onEdit}>
          <Pencil className="size-4 text-muted-foreground" /> Chỉnh sửa
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2" onClick={onToggleVisibility}>
          {isPublic ? <Lock className="size-4 text-muted-foreground" /> : <Globe className="size-4 text-muted-foreground" />}
          {isPublic ? "Chuyển riêng tư" : "Công khai"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="size-4" /> Xóa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ─────────── Status icon (system / public / private) — inline or corner badge ─────────── */
function TemplateStatusIcon({ tpl, className }: { tpl: FlashcardTemplateDTO; className?: string }) {
  const isSystem = tpl.isSystem;
  const isPublic = tpl.visibility === "PUBLIC";
  const content = isSystem ? "Hệ thống" : isPublic ? "Công khai" : "Riêng tư";
  return (
    <TooltipWrapper content={content}>
      <span className={cn("shrink-0 cursor-default", isSystem ? "text-primary" : "text-muted-foreground", className)}>
        {isSystem ? <Sparkles className="size-3.5" /> : isPublic ? <Globe className="size-3.5" /> : <Lock className="size-3.5" />}
      </span>
    </TooltipWrapper>
  );
}

/* ─────────── Title (1 line, truncates up to the icon) + status, with tooltip ─────────── */
function TemplateTitle({ tpl, showStatus = true }: { tpl: FlashcardTemplateDTO; showStatus?: boolean }) {
  const description = tpl.description?.trim();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    const measure = () => setTruncated(el.scrollWidth > el.clientWidth + 1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [tpl.name]);

  const titleEl = (
    <h3 ref={titleRef} className="min-w-0 flex-1 truncate text-sm font-semibold leading-snug text-foreground">
      {tpl.name || "Mẫu thẻ"}
    </h3>
  );
  const showTip = truncated || !!description;

  return (
    <div className="flex items-center gap-2">
      {showTip ? (
        <Tooltip>
          <TooltipTrigger asChild>{titleEl}</TooltipTrigger>
          <TooltipContent side="top" className="max-w-[260px] break-words">
            {truncated && <p className="font-semibold">{tpl.name}</p>}
            {description && <p className={cn("text-xs", truncated && "mt-1 text-muted-foreground")}>{description}</p>}
          </TooltipContent>
        </Tooltip>
      ) : (
        titleEl
      )}
      {showStatus && <TemplateStatusIcon tpl={tpl} />}
    </div>
  );
}

/* ─────────── Grid card — mirrors the deck card (brighten on hover, no bounce) ─────────── */
function TemplateCard({
  tpl,
  owned,
  onPreview,
  onEdit,
  onToggleVisibility,
  onDelete,
}: {
  tpl: FlashcardTemplateDTO;
  owned: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const fields = fieldCount(tpl);

  return (
    <motion.div
      onClick={onPreview}
      className="group relative flex cursor-pointer flex-col rounded-xl border border-border/60 bg-card shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-lg"
    >
      {/* Gradient header (clips its own blobs; root stays un-clipped for the menu) */}
      <div className="relative h-24 shrink-0 overflow-hidden rounded-t-xl bg-gradient-to-br from-primary to-primary/70">
        <div className="absolute -right-5 -top-5 size-20 rounded-full bg-white/10" />
        <div className="absolute -right-2 top-6 size-10 rounded-full bg-white/10" />
        <div className="absolute -bottom-3 left-4 size-14 rounded-full bg-black/10" />
        <div className="absolute bottom-3 left-4 flex size-10 items-center justify-center rounded-lg bg-white/20 shadow-sm backdrop-blur-sm">
          <Layers className="size-5 text-white" />
        </div>
      </div>

      {/* Owned menu — top-right, outside the banner clip */}
      {owned && (
        <div className="absolute right-1.5 top-1.5 z-20 opacity-0 transition-opacity group-hover:opacity-100">
          <OwnedMenu
            tpl={tpl}
            onPreview={onPreview}
            onEdit={onEdit}
            onToggleVisibility={onToggleVisibility}
            onDelete={onDelete}
            trigger={
              <button
                onClick={(e) => e.stopPropagation()}
                className="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Tùy chọn"
              >
                <MoreHorizontal className="size-4" />
              </button>
            }
          />
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <TemplateTitle tpl={tpl} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">{fields} trường</span>
          {tpl.cardType && <span className="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">{tpl.cardType}</span>}
        </div>
      </div>

      {/* Brighten ring on hover */}
      <div className="pointer-events-none absolute inset-0 rounded-xl opacity-0 ring-2 ring-inset ring-primary/10 transition-opacity duration-300 group-hover:opacity-100" />
    </motion.div>
  );
}

/* ─────────── List row (click → preview) ─────────── */
function TemplateRow({
  tpl,
  owned,
  onPreview,
  onEdit,
  onToggleVisibility,
  onDelete,
}: {
  tpl: FlashcardTemplateDTO;
  owned: boolean;
  onPreview: () => void;
  onEdit: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}) {
  const fields = fieldCount(tpl);

  return (
    <div
      onClick={onPreview}
      className="group relative flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5 shadow-sm transition-[box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md"
    >
      {/* Status — pushed onto the top-right corner, overlapping the border */}
      <TemplateStatusIcon
        tpl={tpl}
        className="absolute -right-2 -top-2 z-10 flex size-6 items-center justify-center rounded-full border border-border bg-card shadow-sm"
      />

      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/70 shadow-sm">
        <Layers className="size-5 text-white" />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <TemplateTitle tpl={tpl} showStatus={false} />
        <p className="text-xs text-muted-foreground">
          {fields} trường{tpl.cardType ? ` · ${tpl.cardType}` : ""}
        </p>
      </div>

      {owned && (
        <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
          <OwnedMenu
            tpl={tpl}
            onPreview={onPreview}
            onEdit={onEdit}
            onToggleVisibility={onToggleVisibility}
            onDelete={onDelete}
            trigger={
              <button
                onClick={(e) => e.stopPropagation()}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                aria-label="Tùy chọn"
              >
                <MoreHorizontal className="size-4" />
              </button>
            }
          />
        </div>
      )}
    </div>
  );
}
