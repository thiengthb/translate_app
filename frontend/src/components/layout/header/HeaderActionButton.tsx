import { forwardRef } from "react";

import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { cn } from "@/lib/utils";

interface HeaderActionButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Tooltip + aria-label text. Optional `(shortcut)` rendered as kbd. */
    tooltip: string;
    /** Keyboard hint shown after the tooltip label (e.g. "?", "⌘B"). */
    shortcut?: string;
    /** Icon node — sized 16px by convention to match other header chrome. */
    icon: React.ReactNode;
}

/**
 * Consistent icon button used by every action in the header (notifications,
 * shortcuts, theme, language, more). Standardises height, hover treatment,
 * tooltip pattern and shortcut-hint formatting so the row stays visually
 * uniform.
 *
 * Using `forwardRef` so it can be wrapped by Radix DropdownMenuTrigger
 * (which forwards a ref into its trigger) without console warnings.
 */
export const HeaderActionButton = forwardRef<
    HTMLButtonElement,
    HeaderActionButtonProps
>(({ tooltip, shortcut, icon, className, ...props }, ref) => {
    const tooltipContent = shortcut ? `${tooltip} (${shortcut})` : tooltip;
    return (
        <TooltipWrapper content={tooltipContent}>
            <button
                ref={ref}
                type="button"
                aria-label={tooltip}
                className={cn(
                    "h-8 w-8 inline-flex items-center justify-center rounded-md",
                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                    "transition-colors cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    className,
                )}
                {...props}
            >
                {icon}
            </button>
        </TooltipWrapper>
    );
});

HeaderActionButton.displayName = "HeaderActionButton";
