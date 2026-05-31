import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Loader2, Pencil, Plus, Search, Tag as TagIcon, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { QuestionTagManagerModal } from "./QuestionTagManagerModal";
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

export default function QuestionBankPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<QuestionBankDTO[]>([]);
  const [tags, setTags] = useState<QuestionTagDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

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

  const toggleTag = (id: number) =>
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const handleDelete = async (q: QuestionBankDTO) => {
    if (!window.confirm("Delete this question? This cannot be undone.")) return;
    setDeletingId(q.id);
    try {
      await assessmentApi.deleteQuestion(q.id);
      setQuestions((prev) => prev.filter((x) => x.id !== q.id));
    } catch {
      toast.error("Failed to delete question.");
    } finally {
      setDeletingId(null);
    }
  };

  const openNew = () => navigate("/questions/new");
  const openEdit = (q: QuestionBankDTO) => navigate(`/questions/${q.id}/edit`);

  return (
    <MainLayout pathName={{ "/questions": "Question Bank" }}>
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-50">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your questions…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" onClick={() => setTagManagerOpen(true)}>
            <TagIcon className="size-4 mr-1" /> Manage tags
          </Button>
          <Button onClick={openNew}>
            <Plus className="size-4 mr-1" /> New question
          </Button>
        </div>

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-muted-foreground">Filter:</span>
            <TagChips tags={tags} selectedIds={selectedTagIds} onToggle={toggleTag} />
            {selectedTagIds.size > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTagIds(new Set())}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Clear
              </button>
            )}
          </div>
        )}

        {/* List */}
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
          <div className="space-y-2">
            {questions.map((q) => (
              <Card key={q.id} className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{q.prompt}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{TYPE_LABELS[q.questionType] ?? q.questionType}</Badge>
                    <span className="text-xs text-muted-foreground">{q.options.length} options</span>
                    {q.contentVersion != null && (
                      <span className="text-[10px] text-muted-foreground">v{q.contentVersion}</span>
                    )}
                    <TagBadges tags={q.tags} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(q)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive"
                    disabled={deletingId === q.id} onClick={() => handleDelete(q)}>
                    {deletingId === q.id ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <QuestionTagManagerModal
        open={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        onChanged={() => { loadTags(); loadQuestions(); }}
      />
    </MainLayout>
  );
}
