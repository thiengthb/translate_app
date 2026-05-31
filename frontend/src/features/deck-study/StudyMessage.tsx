import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface StudyMessageProps {
  /** Icon node, e.g. `<Brain size={26} />`. */
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; icon?: ReactNode; onClick: () => void };
}

/**
 * Shared empty/done/complete state for every study mode — a muted icon circle,
 * a terse title, an optional description, and an optional action. Mirrors the
 * SRS Review "Session complete" / "No cards due" look so all modes match.
 */
export function StudyMessage({ icon, title, description, action }: StudyMessageProps) {
  return (
    <div className="flex h-full min-h-[70vh] items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-muted-foreground">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="max-w-md text-center">
          <p className="font-medium text-foreground">{title}</p>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && (
          <Button size="sm" onClick={action.onClick}>
            {action.icon}
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
