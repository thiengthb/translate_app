import { useEffect, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionTagDTO } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Check, Loader2, Pencil, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Full CRUD for the current user's question tags. Tags are private per user.
 * `onChanged` lets the opener refresh its own tag list when something changes.
 */
export function QuestionTagManagerModal({
  open,
  onClose,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [tags, setTags] = useState<QuestionTagDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    assessmentApi.fetchQuestionTags()
      .then(setTags)
      .catch(() => toast.error("Failed to load tags."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const notify = () => onChanged?.();

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await assessmentApi.createQuestionTag({ name });
      setNewName("");
      load();
      notify();
    } catch {
      toast.error("Failed to create tag (it may already exist).");
    } finally {
      setCreating(false);
    }
  };

  const saveEdit = async (tag: QuestionTagDTO) => {
    const name = editName.trim();
    if (!name || name === tag.name) { setEditingId(null); return; }
    setBusyId(tag.id);
    try {
      await assessmentApi.updateQuestionTag(tag.id, { name });
      setEditingId(null);
      load();
      notify();
    } catch {
      toast.error("Failed to rename tag.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (tag: QuestionTagDTO) => {
    if (!window.confirm(`Delete tag "${tag.name}"? Questions keep their other tags.`)) return;
    setBusyId(tag.id);
    try {
      await assessmentApi.deleteQuestionTag(tag.id);
      load();
      notify();
    } catch {
      toast.error("Failed to delete tag.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TagIcon className="size-4" /> Manage tags
          </DialogTitle>
          <DialogDescription>Your private tags for organising and filtering questions.</DialogDescription>
        </DialogHeader>

        {/* Create */}
        <div className="flex items-center gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }}
            placeholder="New tag name…"
          />
          <Button onClick={create} disabled={creating || !newName.trim()}>
            {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </Button>
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto space-y-1.5 pt-1">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No tags yet.</p>
          ) : (
            tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-2 rounded-lg border p-2">
                {editingId === tag.id ? (
                  <>
                    <Input
                      value={editName}
                      autoFocus
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void saveEdit(tag); } }}
                      className="h-8"
                    />
                    <Button size="sm" variant="ghost" disabled={busyId === tag.id} onClick={() => saveEdit(tag)}>
                      {busyId === tag.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="size-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 flex items-center gap-1.5 text-sm">
                      <TagIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate">{tag.name}</span>
                      {tag.code && <span className="text-[11px] text-muted-foreground">· {tag.code}</span>}
                    </span>
                    <Button size="sm" variant="ghost"
                      onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive"
                      disabled={busyId === tag.id} onClick={() => remove(tag)}>
                      {busyId === tag.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                    </Button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
