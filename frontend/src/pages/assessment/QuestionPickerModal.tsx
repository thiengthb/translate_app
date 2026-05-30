import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionBankDTO } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { QuestionFormModal } from "./QuestionFormModal";

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

  const load = () => {
    setLoading(true);
    assessmentApi.fetchQuestions(search.trim() ? { search: search.trim() } : {})
      .then(setQuestions)
      .catch(() => toast.error("Failed to load questions."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(load, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, search]);

  const excluded = new Set(excludeIds);

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">{q.questionType.replace("_", " ")}</Badge>
                        <span className="text-xs text-muted-foreground">{q.options.length} options</span>
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
        </DialogContent>
      </Dialog>

      <QuestionFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={(q) => { setFormOpen(false); load(); onAdd(q.id); }} />
    </>
  );
}
