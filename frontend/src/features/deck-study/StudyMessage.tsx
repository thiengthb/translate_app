import type { ReactNode } from "react";
import { EmptyState } from "@/components/common/EmptyState";

interface StudyMessageProps {
  /** Icon node, e.g. `<Brain size={26} />`. */
  icon: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; icon?: ReactNode; onClick: () => void };
}

/**
 * Empty / done / complete state for every study mode. Thin wrapper over the
 * shared {@link EmptyState} that fills the study surface height so all modes
 * (and the rest of the app) share one look.
 */
export function StudyMessage({ icon, title, description, action }: StudyMessageProps) {
  return (
    <EmptyState
      className="h-full min-h-[70vh]"
      icon={icon}
      title={title}
      description={description}
      action={action}
    />
  );
}
