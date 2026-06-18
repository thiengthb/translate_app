import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ChevronRight, FileQuestion, Loader2, Pencil, Plus, Search, Tag as TagIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DataPagination } from "@/components/common/DataPagination";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { TagBadges } from "./QuestionTags";
import { getQuestionTagColor, QuestionTagPill } from "./QuestionTagPickerSheet";
import { QUESTION_TYPE_LABELS, QuestionOptionsPreview } from "./QuestionOptionsPreview";

const PAGE_SIZES = [10, 20, 50];

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionBankDTO[]>([]);
  const [tags, setTags] = useState<QuestionTagDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const [newTagOpen, setNewTagOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<QuestionBankDTO | null>(null);

  /* ── Pagination (client-side) ── */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  /* Debounce search */
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadTags = () =>
    assessmentApi.fetchQuestionTags().then(setTags).catch(() => setTags([]));

  useEffect(() => { loadTags(); }, []);

  const loadQuestions = () => {
    setLoading(true);
    const term = debounced.trim().toLowerCase();
    const tagIds = Array.from(selectedTagIds);
    const request = tagIds.length > 0
      ? assessmentApi.fetchQuestionsByTags(tagIds, false)
          .then((qs) => (term ? qs.filter((q) => q.prompt.toLowerCase().includes(term)) : qs))
      : assessmentApi.fetchQuestions(term ? { search: debounced.trim() } : {});
    request
      .then(setQuestions)
      .catch(() => toast.error("Failed to load questions."))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadQuestions(); }, [debounced, selectedTagIds]);

  // Any change to the result set or page size returns to page 1.
  useEffect(() => { setPage(1); }, [debounced, selectedTagIds, pageSize]);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const createTag = async () => {
    const name = newTagName.trim();
    if (!name) return;
    setIsSavingTag(true);
    try {
      const created = await assessmentApi.createQuestionTag({ name });
      setTags((prev) => (prev.some((t) => t.id === created.id) ? prev : [...prev, created]));
      setSelectedTagIds(new Set([created.id]));
      setNewTagName("");
      setNewTagOpen(false);
      toast.success("Tag created.");
    } catch {
      toast.error("Failed to create tag (it may already exist).");
    } finally {
      setIsSavingTag(false);
    }
  };

  const performDelete = async () => {
    if (!confirmDel) return;
    setDeletingId(confirmDel.id);
    try {
      await assessmentApi.deleteQuestion(confirmDel.id);
      setQuestions((prev) => prev.filter((x) => x.id !== confirmDel.id));
      setConfirmDel(null);
    } catch {
      toast.error("Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  };

  const openNew = () => navigate("/questions/new");
  const openEdit = (q: QuestionBankDTO) => navigate(`/questions/${q.id}/edit`);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = questions.slice(pageStart, pageStart + pageSize);

  return (
    <MainLayout pathName={{ "/questions": "Question Bank" }}>
      <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your questions…"
              className="pl-9"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="size-4 mr-1" /> New question
          </Button>
        </div>

        {/* Tag filter — library-style pill row (scrolls horizontally) */}
        <div className="shrink-0 pt-3">
          <ScrollHintContainer axis="horizontal" viewportClassName="pb-0.5">
            <div className="flex w-max items-center gap-2 py-1">
              <QuestionTagPill
                label="All"
                active={selectedTagIds.size === 0}
                onClick={() => setSelectedTagIds(new Set())}
              />
              <button
                type="button"
                onClick={() => setNewTagOpen(true)}
                title="Create new tag"
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                <Plus className="size-4" />
              </button>
              {tags.map((t) => (
                <QuestionTagPill
                  key={t.id}
                  label={t.name}
                  active={selectedTagIds.has(t.id)}
                  color={getQuestionTagColor(t)}
                  onClick={() => toggleTag(t.id)}
                />
              ))}
            </div>
          </ScrollHintContainer>
        </div>

        {/* Content (scrolls; footer below stays pinned) */}
        <ScrollHintContainer axis="vertical" className="flex-1 min-h-0 mt-4">
          {loading ? (
            <div className="flex items-center justify-center h-60">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 gap-2 text-muted-foreground">
              <FileQuestion className="size-10 opacity-40" />
              <p className="text-sm">
                {debounced || selectedTagIds.size > 0
                  ? "No questions match your filters."
                  : "You haven't created any questions yet."}
              </p>
              {!debounced && selectedTagIds.size === 0 && (
                <Button variant="outline" size="sm" onClick={openNew}>
                  <Plus className="size-4 mr-1" /> Create your first question
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-3 h-10 px-3 bg-muted border-b text-xs font-semibold text-foreground">
                <span className="w-4 shrink-0" aria-hidden />
                <span className="w-7 shrink-0 text-center">#</span>
                <span className="flex-1 min-w-0">Question</span>
                <span className="hidden sm:block w-16 shrink-0">Level</span>
                <span className="w-28 shrink-0">Type</span>
                <span className="hidden sm:block w-14 shrink-0 text-right">Options</span>
                <span className="w-[72px] shrink-0 text-right pr-1">Actions</span>
              </div>
              {/* Rows */}
              {pageItems.map((q, i) => (
                <BankRow
                  key={q.id}
                  question={q}
                  index={i}
                  order={pageStart + i + 1}
                  deleting={deletingId === q.id}
                  onEdit={() => openEdit(q)}
                  onDelete={() => setConfirmDel(q)}
                />
              ))}
            </div>
          )}
        </ScrollHintContainer>

        {/* Pagination — pinned to the bottom-right corner of the page */}
        {!loading && questions.length > 0 && (
          <div className="shrink-0 border-t border-border bg-background px-2 py-2 mt-px flex flex-wrap items-center justify-end gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                Tổng: <span className="font-semibold text-foreground">{questions.length}</span>
              </span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((s) => (
                    <SelectItem key={s} value={String(s)}>{s} / page</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DataPagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Dialog open={newTagOpen} onOpenChange={(open) => {
        setNewTagOpen(open);
        if (!open) setNewTagName("");
      }}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-[520px]">
          <DialogHeader className="border-b border-border px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <TagIcon className="size-5" />
                </span>
                <DialogTitle className="text-base">Create new tag</DialogTitle>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 items-center gap-2 rounded-full bg-primary/12 px-3 text-sm font-semibold text-primary">
                  <span className="size-2 rounded-full bg-primary" aria-hidden />
                  {newTagName.trim() || "Tag name"}
                </span>
                <button
                  type="button"
                  onClick={() => setNewTagOpen(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-6 px-6 py-6">
            <label className="space-y-2 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tag name</span>
              <Input
                autoFocus
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void createTag();
                  }
                }}
                placeholder="e.g. Grammar"
                className="h-12 rounded-xl"
              />
            </label>
          </div>

          <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 sm:justify-between">
            <Button variant="outline" onClick={() => setNewTagOpen(false)} disabled={isSavingTag}>
              Cancel
            </Button>
            <Button onClick={createTag} disabled={isSavingTag || !newTagName.trim()}>
              {isSavingTag ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Plus className="mr-2 size-4" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDel != null}
        loading={deletingId != null}
        title="Delete question?"
        description={
          confirmDel
            ? `This permanently deletes “${confirmDel.prompt.slice(0, 60)}${confirmDel.prompt.length > 60 ? "…" : ""}”. This cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={performDelete}
        onCancel={() => { if (deletingId == null) setConfirmDel(null); }}
      />
    </MainLayout>
  );
}

/* ─────────────────────────────────────────
   Single bank row (ProTable style): chevron + prompt + meta + actions,
   expanding to a full-width options preview below.
───────────────────────────────────────── */
function BankRow({
  question: q,
  index,
  order,
  deleting,
  onEdit,
  onDelete,
}: {
  question: QuestionBankDTO;
  index: number;
  order: number;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
        }}
        aria-expanded={open}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 border-b border-border/40 cursor-pointer transition-colors",
          index % 2 === 0 ? "bg-muted/20" : "bg-card",
          "hover:bg-accent/40",
        )}
      >
        {/* Expand chevron */}
        <span className="shrink-0 flex items-center justify-center size-4 text-muted-foreground">
          <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
        </span>

        {/* Order number */}
        <span className="w-7 shrink-0 text-center text-xs font-semibold text-muted-foreground tabular-nums">
          {order}
        </span>

        {/* Prompt */}
        <span className="flex-1 min-w-0 text-sm font-medium truncate">{q.prompt}</span>

        {/* Level */}
        <span className="hidden sm:flex w-16 shrink-0">
          {q.difficultyLevel && (
            <Badge variant="outline" className="text-[10px]">{q.difficultyLevel}</Badge>
          )}
        </span>

        {/* Type */}
        <span className="w-28 shrink-0">
          <Badge variant="secondary" className="text-[10px] font-medium">
            {QUESTION_TYPE_LABELS[q.questionType] ?? q.questionType}
          </Badge>
        </span>

        {/* Options count */}
        <span className="hidden sm:block w-14 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
          {q.options.length}
        </span>

        {/* Actions (don't toggle expand) */}
        <span
          className="w-[72px] shrink-0 flex items-center justify-end gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Button size="sm" variant="ghost" className="size-8 p-0" onClick={onEdit} aria-label="Edit question">
            <Pencil className="size-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="size-8 p-0 text-destructive"
            disabled={deleting}
            onClick={onDelete}
            aria-label="Delete question"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          </Button>
        </span>
      </div>

      {/* Expanded options preview */}
      {open && (
        <div className="border-b border-border/40 bg-background px-4 py-3 pl-10">
          {q.tags && q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2"><TagBadges tags={q.tags} /></div>
          )}
          <QuestionOptionsPreview question={q} />
        </div>
      )}
    </>
  );
}
