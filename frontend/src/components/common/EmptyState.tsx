import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  /** Icon node, e.g. `<BookOpen className="size-7" />`. Rendered in a muted tile. */
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  /** Optional primary action button. */
  action?: { label: string; icon?: ReactNode; onClick: () => void };
  /** Extra classes for the wrapper — typically height (e.g. "h-64", "min-h-[70vh]", "flex-1"). */
  className?: string;
}

/**
 * The single shared "no data" / empty / done state used across pages and study
 * modes: a muted icon tile, a title, an optional description, and an optional
 * action. Callers control the available height via `className`.
 */
export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex w-full flex-col items-center justify-center gap-4 px-4 py-12 text-center", className)}>
      {icon && (
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/70">
          {icon}
        </div>
      )}
      <div className="max-w-sm space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button size="sm" onClick={action.onClick} className="gap-1.5">
          {action.icon}
          {action.label}
        </Button>
      )}
    </div>
  );
}
