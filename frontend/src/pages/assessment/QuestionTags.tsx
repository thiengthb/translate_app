import { useState } from "react";
import { assessmentApi } from "@/api";
import type { QuestionTagDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Loader2, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

/**
 * Presentational toggleable tag chips. Selecting is controlled by the parent.
 */
export function TagChips({
  tags,
  selectedIds,
  onToggle,
  emptyHint,
}: {
  tags: QuestionTagDTO[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  emptyHint?: string;
}) {
  if (tags.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyHint ?? "No tags yet."}</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((t) => {
        const active = selectedIds.has(t.id);
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onToggle(t.id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            )}
            title={t.code ?? t.name}
          >
            {active ? <Check className="size-3" /> : <TagIcon className="size-3" />}
            {t.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Inline "create tag" input. Calls the API and bubbles the created tag up so
 * the parent can add it to its list and (optionally) auto-select it.
 */
export function TagCreateInline({ onCreated }: { onCreated: (tag: QuestionTagDTO) => void }) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const tag = await assessmentApi.createQuestionTag({ name: trimmed });
      onCreated(tag);
      setName("");
    } catch {
      toast.error("Failed to create tag (it may already exist).");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void create();
          }
        }}
        placeholder="New tag name…"
        className="h-8 text-xs"
      />
      <Button type="button" variant="outline" size="sm" disabled={saving || !name.trim()} onClick={create}>
        {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
        Add
      </Button>
    </div>
  );
}

/** Read-only badges for showing a question's tags. */
export function TagBadges({ tags }: { tags?: QuestionTagDTO[] | null }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Badge key={t.id} variant="secondary" className="text-[10px] gap-0.5">
          <TagIcon className="size-2.5" />
          {t.name}
        </Badge>
      ))}
    </div>
  );
}
