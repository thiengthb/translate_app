import { Info } from "lucide-react";

import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { cn } from "@/lib/utils";

interface InfoLabelProps {
    /** The visible label. Accepts a node so callers can pass styled text
     *  (e.g. a `<BreadcrumbPage>`). */
    title: React.ReactNode;
    /** Tooltip text shown behind the ⓘ icon. When empty the icon is hidden
     *  and only the title renders. */
    info?: string;
    /** Extra classes on the wrapper. */
    className?: string;
    /** Tooltip side. */
    side?: "top" | "bottom" | "left" | "right";
    /** ⓘ icon size in px. */
    iconSize?: number;
}

/**
 * A label paired with a small ⓘ (information) icon. Hovering the icon reveals
 * a tooltip with `info` — letting the visible label stay terse while the
 * full explanation stays one hover away.
 *
 *   Title ⓘ   ← hover the ⓘ → tooltip with details
 */
export function InfoLabel({
    title,
    info,
    className,
    side = "top",
    iconSize = 13,
}: InfoLabelProps) {
    return (
        <span className={cn("inline-flex items-center gap-1.5 min-w-0", className)}>
            {title}
            {info && info.trim().length > 0 && (
                <TooltipWrapper content={info} side={side}>
                    <button
                        type="button"
                        aria-label={typeof title === "string" ? `Thông tin: ${title}` : "Thông tin"}
                        className="inline-flex items-center justify-center shrink-0 text-muted-foreground/60 hover:text-primary transition-colors cursor-help"
                    >
                        <Info size={iconSize} />
                    </button>
                </TooltipWrapper>
            )}
        </span>
    );
}
