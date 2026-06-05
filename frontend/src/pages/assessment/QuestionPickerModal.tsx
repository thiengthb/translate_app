import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { QuestionForm } from "./QuestionForm";
import { TagBadges, TagChips } from "./QuestionTags";

const TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: "Single Choice",
  MULTIPLE_CHOICE: "Multiple Choice",
  TRUE_FALSE: "True / False",
  FILL_BLANK: "Fill in the Blank",
  // Hidden types — kept for data display only
  WRITING: "Writing",
  MATCHING: "Matching",
  ORDERING: "Ordering",
  LISTENING: "Listening",
};

export function QuestionPickerModal({
  open, onClose, onAdd, excludeIds = [],
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (questionId: number) => void;
  excludeIds?: number[];
}) {
  const [questions, setQuestions] = useState<QuestionBankDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  /* ── Tag filter ── */
  const [allTags, setAllTags] = useState<QuestionTagDTO[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());
  const [matchAll, setMatchAll] = useState(false);

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
    if (!open) return;
    assessmentApi.fetchQuestionTags().then(setAllTags).catch(() => setAllTags([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search, selectedTagIds, matchAll]);

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const excluded = new Set(excludeIds);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        {formOpen ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                >
                  <ArrowLeft className="size-4 mr-1" /> Back
                </button>
                New question
              </DialogTitle>
              <DialogDescription>Create a question and add it to this quiz.</DialogDescription>
            </DialogHeader>
            <QuestionForm
              onCancel={() => setFormOpen(false)}
              onSaved={(q) => { setFormOpen(false); load(); onAdd(q.id); }}
            />
          </>
        ) : (
          <>
          <DialogHeader>
            <DialogTitle>Add questions</DialogTitle>
            <DialogDescription>Pick from the question bank or create a new one.</DialogDescription>
          </DialogHeader>

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

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
            ) : questions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No questions found.</p>
            ) : (
              questions.map((q) => {
                const added = excluded.has(q.id);
                return (
                  <Card key={q.id} className="p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{q.prompt}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[q.questionType] ?? q.questionType}</Badge>
                        <span className="text-xs text-muted-foreground">{q.options.length} options</span>
                        <TagBadges tags={q.tags} />
                      </div>
                    </div>
                    <Button size="sm" variant={added ? "ghost" : "outline"} disabled={added} onClick={() => onAdd(q.id)}>
                      {added ? "Added" : <><Plus className="size-4 mr-1" />Add</>}
                    </Button>
                  </Card>
                );
              })
            )}
          </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
