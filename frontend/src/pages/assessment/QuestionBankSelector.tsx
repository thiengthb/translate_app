import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DataPagination } from "@/components/common/DataPagination";
import { QuestionForm } from "./QuestionForm";
import { TagBadges, TagChips } from "./QuestionTags";
import { QUESTION_TYPE_LABELS, QuestionOptionsPreview } from "./QuestionOptionsPreview";

const PAGE_SIZES = [10, 20, 50];

/**
 * Inline question-bank browser for the quiz wizard's step 2. Every question
 * in the bank is shown as a card — clicking the card toggles whether it's
 * part of the quiz (selected cards are checked + highlighted), and the
 * chevron expands a dropdown that previews the question's options (correct
 * answers in green). Supports search + tag filtering and creating a
 * brand-new question on the fly.
 */
export function QuestionBankSelector({
  selectedIds,
  onToggle,
}: {
  /** questionIds currently in the quiz. */
  selectedIds: Set<number>;
  /** Toggle a question in/out of the quiz. */
  onToggle: (questionId: number) => void;
}) {
  const [questions, setQuestions] = useState<QuestionBankDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  /* ── Tag filter ── */
  const [allTags, setAllTags] = useState<QuestionTagDTO[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [matchAll, setMatchAll] = useState(false);

  /* ── Pagination (client-side, over the fetched questions) ── */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const load = () => {
    setLoading(true);
    const term = search.trim().toLowerCase();
    const tagIds = Array.from(selectedTagIds);
    const request = tagIds.length > 0
      ? assessmentApi.fetchQuestionsByTags(tagIds, matchAll)
          // tag endpoint doesn't take a search term — filter client-side
          .then((qs) => (term ? qs.filter((q) => q.prompt.toLowerCase().includes(term)) : qs))
      : assessmentApi.fetchQuestions(term ? { search: search.trim() } : {});
    request
      .then(setQuestions)
      .catch(() => toast.error("Failed to load questions."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    assessmentApi.fetchQuestionTags().then(setAllTags).catch(() => setAllTags([]));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedTagIds, matchAll]);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  // Any change to the result set or page size returns to page 1.
  useEffect(() => {
    setPage(1);
  }, [search, selectedTagIds, matchAll, pageSize]);

  const totalPages = Math.max(1, Math.ceil(questions.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = questions.slice(pageStart, pageStart + pageSize);

  return (
    <div className="space-y-3">
      {/* Search + create */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search questions…" className="pl-9" />
        </div>
        <Button variant="outline" onClick={() => setFormOpen(true)}><Plus className="size-4 mr-1" />New</Button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed p-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Filter by tag</span>
            {selectedTagIds.size > 0 && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch checked={matchAll} onCheckedChange={setMatchAll} />
                  Match all
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedTagIds(new Set())}
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <TagChips tags={allTags} selectedIds={selectedTagIds} onToggle={toggleTag} />
        </div>
      )}

      {/* Bank — ProTable-style rows; each row expands to preview its options */}
      <div className="rounded-lg border overflow-hidden">
        <div className="max-h-[72vh] min-h-[28rem] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-72"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
          ) : questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 gap-2 text-muted-foreground">
              <Search className="size-8 opacity-30" />
              <p className="text-sm">No questions found.</p>
            </div>
          ) : (
            <>
              {/* Header row */}
              <div className="sticky top-0 z-10 flex items-center gap-3 h-10 px-3 bg-muted border-b text-xs font-semibold text-foreground">
                <span className="w-4 shrink-0" aria-hidden />
                <span className="w-4 shrink-0" aria-hidden />
                <span className="flex-1 min-w-0">Question</span>
                <span className="hidden sm:block w-16 shrink-0">Level</span>
                <span className="w-28 shrink-0">Type</span>
                <span className="hidden sm:block w-14 shrink-0 text-right">Options</span>
              </div>
              {/* Rows (current page) */}
              {pageItems.map((q, i) => (
                <BankQuestionRow
                  key={q.id}
                  question={q}
                  index={i}
                  selected={selectedIds.has(q.id)}
                  onToggle={() => onToggle(q.id)}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Bank pagination — grouped in the bottom-right corner */}
      {!loading && questions.length > 0 && (
        <div className="flex flex-wrap items-center justify-end gap-3">
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

      {/* Create-new question dialog */}
      <Dialog open={formOpen} onOpenChange={(o) => !o && setFormOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New question</DialogTitle>
            <DialogDescription>Create a question, then it's added to this quiz.</DialogDescription>
          </DialogHeader>
          <QuestionForm
            onCancel={() => setFormOpen(false)}
            onSaved={(created) => {
              setFormOpen(false);
              load();
              if (!selectedIds.has(created.id)) onToggle(created.id);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─────────────────────────────────────────
   Single bank row (ProTable style): chevron + checkbox + prompt + meta,
   expanding to a full-width options preview below.
───────────────────────────────────────── */
function BankQuestionRow({
  question: q,
  index,
  selected,
  onToggle,
}: {
  question: QuestionBankDTO;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
        }}
        aria-pressed={selected}
        className={cn(
          "group flex items-center gap-3 px-3 py-2.5 border-b border-border/40 cursor-pointer transition-colors",
          selected
            ? "bg-primary/5 hover:bg-primary/10"
            : cn(index % 2 === 0 ? "bg-muted/20" : "bg-card", "hover:bg-accent/40"),
        )}
      >
        {/* Expand chevron (doesn't toggle selection) */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
          aria-label={open ? "Hide options" : "Show options"}
          aria-expanded={open}
          className="shrink-0 flex items-center justify-center size-4 text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
        </button>

        {/* Selection checkbox */}
        <span
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
            selected
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/40 text-transparent group-hover:border-primary/50",
          )}
        >
          <Check className="size-3" />
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
      </div>

      {/* Expanded options preview (ProTable-style detail row) */}
      {open && (
        <div className="border-b border-border/40 bg-background px-4 py-3 pl-11">
          {q.tags && q.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2"><TagBadges tags={q.tags} /></div>
          )}
          <QuestionOptionsPreview question={q} />
        </div>
      )}
    </>
  );
}
