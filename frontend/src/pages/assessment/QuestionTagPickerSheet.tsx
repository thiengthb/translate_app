import type { QuestionBankDTO, QuestionTagDTO } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { cn } from "@/lib/utils";
import { Check, Loader2, Tag as TagIcon } from "lucide-react";
import { TagCreateInline } from "./QuestionTags";

const QUESTION_TAG_COLORS = [
  "#dc5f2f",
  "#2f7d68",
  "#7c6fce",
  "#c47a1c",
  "#2f6f9f",
  "#9a5b7d",
  "#4f7c38",
  "#b45353",
];

export function getQuestionTagColor(tag: Pick<QuestionTagDTO, "id" | "name">) {
  const seed = tag.id ?? Array.from(tag.name).reduce((sum, c) => sum + c.charCodeAt(0), 0);
  return QUESTION_TAG_COLORS[Math.abs(seed) % QUESTION_TAG_COLORS.length];
}

export function QuestionTagPill({
  label,
  active,
  color,
  count,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  count?: number;
  disabled?: boolean;
  onClick: () => void;
}) {
  const tint = color ? `color-mix(in srgb, ${color} 13%, transparent)` : undefined;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-sm font-medium transition-all whitespace-nowrap",
        active
          ? "border-transparent text-primary-foreground shadow-sm"
          : "border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground",
        disabled && "cursor-wait opacity-70",
      )}
      style={active ? { backgroundColor: color ?? "hsl(var(--primary))" } : { backgroundColor: tint }}
    >
      {color && (
        <span
          className={cn("size-2 rounded-full", active ? "bg-white/80" : "")}
          style={!active ? { backgroundColor: color } : undefined}
          aria-hidden
        />
      )}
      <span>{label}</span>
      {count != null && count > 0 && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] leading-none",
            active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground",
          )}
        >
          {count}
        </span>
      )}
      {active && <Check className="size-3.5" />}
    </button>
  );
}

export function QuestionTagPickerSheet({
  open,
  question,
  tags,
  savingTagIds,
  onOpenChange,
  onToggleTag,
  onTagCreated,
}: {
  open: boolean;
  question: QuestionBankDTO | null;
  tags: QuestionTagDTO[];
  savingTagIds: Set<number>;
  onOpenChange: (open: boolean) => void;
  onToggleTag: (tag: QuestionTagDTO) => void | Promise<void>;
  onTagCreated: (tag: QuestionTagDTO) => void | Promise<void>;
}) {
  const selectedIds = new Set(question?.tags?.map((t) => t.id) ?? question?.tagIds ?? []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[92vw] gap-0 overflow-hidden p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2">
            <TagIcon className="size-4 text-primary" />
            Question tags
          </SheetTitle>
          <SheetDescription>Choose labels for this question. Changes are saved immediately.</SheetDescription>
        </SheetHeader>

        <ScrollHintContainer axis="vertical" className="flex-1 min-h-0">
          <div className="space-y-5 p-5">
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Question</p>
              <p className="mt-1 line-clamp-3 text-sm font-medium">{question?.prompt ?? "No question selected"}</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Available tags</p>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
                )}
              </div>

              {tags.length === 0 ? (
                <div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  No question tags yet. Create one below, then attach it to this question.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => {
                    const active = selectedIds.has(tag.id);
                    return (
                      <QuestionTagPill
                        key={tag.id}
                        label={tag.name}
                        active={active}
                        color={getQuestionTagColor(tag)}
                        disabled={savingTagIds.has(tag.id)}
                        onClick={() => void onToggleTag(tag)}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2 rounded-xl border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create tag</p>
              <TagCreateInline onCreated={(tag) => void onTagCreated(tag)} />
            </div>
          </div>
        </ScrollHintContainer>

        <div className="border-t border-border p-4">
          <Button className="w-full" onClick={() => onOpenChange(false)}>
            {savingTagIds.size > 0 && <Loader2 className="mr-2 size-4 animate-spin" />}
            Done
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
