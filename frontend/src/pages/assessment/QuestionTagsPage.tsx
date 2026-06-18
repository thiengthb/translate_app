import { useEffect, useRef, useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionTagDTO } from "@/types";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirmdialog";
import { Check, Loader2, Pencil, Plus, Tag as TagIcon, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";

/** Surface the real backend reason (status + message) instead of a generic string. */
function errMsg(e: unknown, fallback: string): string {
  const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
  const status = err?.response?.status;
  const serverMsg = err?.response?.data?.message;
  if (status === 403) return "You don't have permission to do that (403).";
  if (serverMsg) return `${serverMsg}${status ? ` (${status})` : ""}`;
  if (status) return `${fallback} (HTTP ${status})`;
  if (err?.message?.includes("Network")) return "Network error — is the backend reachable?";
  return fallback;
}

export default function QuestionTagsPage() {
  const { hasPermission } = usePermissions();
  const canCreate = hasPermission("QUESTION_TAG_CREATE");
  const canUpdate = hasPermission("QUESTION_TAG_UPDATE");
  const canDelete = hasPermission("QUESTION_TAG_DELETE");

  const newInputRef = useRef<HTMLInputElement>(null);
  const [tags, setTags] = useState<QuestionTagDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState<QuestionTagDTO | null>(null);

  const load = () => {
    setLoading(true);
    assessmentApi.fetchQuestionTags()
      .then(setTags)
      .catch((e) => toast.error(errMsg(e, "Failed to load tags.")))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    const name = newName.trim();
    if (!name) {
      // Don't silently no-op — make it obvious a name is required.
      toast.error("Enter a tag name first.");
      newInputRef.current?.focus();
      return;
    }
    setCreating(true);
    try {
      await assessmentApi.createQuestionTag({ name });
      setNewName("");
      load();
      toast.success("Tag created.");
    } catch (e) {
      toast.error(errMsg(e, "Failed to create tag (it may already exist)."));
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
    } catch (e) {
      toast.error(errMsg(e, "Failed to rename tag."));
    } finally {
      setBusyId(null);
    }
  };

  const performRemove = async () => {
    if (!confirmDel) return;
    setBusyId(confirmDel.id);
    try {
      await assessmentApi.deleteQuestionTag(confirmDel.id);
      setTags((prev) => prev.filter((t) => t.id !== confirmDel.id));
      setConfirmDel(null);
    } catch (e) {
      toast.error(errMsg(e, "Failed to delete tag."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <MainLayout pathName={{ "/question-tags": "Question Tags" }}>
      <div className="space-y-5 max-w-2xl">
        <p className="text-sm text-muted-foreground">
          Your private tags for organising and filtering questions.
        </p>

        {/* Create */}
        {canCreate && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                ref={newInputRef}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void create(); } }}
                placeholder="New tag name…"
                className="pl-9"
              />
            </div>
            <Button onClick={create} disabled={creating}>
              {creating ? <Loader2 className="size-4 animate-spin mr-1" /> : <Plus className="size-4 mr-1" />}
              New tag
            </Button>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : tags.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <TagIcon className="size-10 opacity-40" />
            <p className="text-sm">
              {canCreate ? "No tags yet — create your first one above." : "No tags yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {tags.map((tag) => (
              <Card key={tag.id} className="p-3 flex items-center gap-2">
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
                      <span className="truncate font-medium">{tag.name}</span>
                      {tag.code && <span className="text-[11px] text-muted-foreground">· {tag.code}</span>}
                    </span>
                    {canUpdate && (
                      <Button size="sm" variant="ghost"
                        onClick={() => { setEditingId(tag.id); setEditName(tag.name); }}>
                        <Pencil className="size-3.5" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button size="sm" variant="ghost" className="text-destructive"
                        disabled={busyId === tag.id} onClick={() => setConfirmDel(tag)}>
                        {busyId === tag.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </Button>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDel != null}
        loading={busyId != null}
        title="Delete tag?"
        description={confirmDel ? `Delete tag "${confirmDel.name}"? Questions keep their other tags.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={performRemove}
        onCancel={() => { if (busyId == null) setConfirmDel(null); }}
      />
    </MainLayout>
  );
}
