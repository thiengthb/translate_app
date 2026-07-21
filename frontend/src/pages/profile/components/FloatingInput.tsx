import { forwardRef, type ReactNode, type TextareaHTMLAttributes } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Floating-label field used across the Profile forms.
 *
 * The label starts vertically centred inside the control and, using Tailwind's
 * `peer` mechanism, floats up + shrinks + turns pink the moment the input is
 * focused or holds a value (`:not(:placeholder-shown)` — the input carries a
 * single-space placeholder so the CSS test works). On focus the whole shell
 * gets a soft pink glow ring. `readOnly` swaps to a muted, non-interactive
 * look so the same component covers both view and edit modes.
 */

type Shared = {
    label: string;
    icon?: ReactNode;
    /** Rendered on the right edge (e.g. a show/hide password toggle). */
    rightSlot?: ReactNode;
    error?: boolean;
};

const shellBase =
    "group relative rounded-2xl border bg-white/70 transition-all duration-300 " +
    "focus-within:ring-4 focus-within:ring-primary/15";

function shellState(error?: boolean, readOnly?: boolean) {
    if (error) {
        return "border-destructive/60 focus-within:border-destructive focus-within:ring-destructive/15";
    }
    if (readOnly) {
        return "border-border/70 bg-muted/50";
    }
    return "border-border hover:border-primary/40 focus-within:border-primary focus-within:shadow-[0_10px_30px_-14px_rgba(255,107,157,0.7)]";
}

function labelClasses(hasIcon?: boolean) {
    return cn(
        "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-muted-foreground",
        "transition-all duration-200 ease-out",
        hasIcon ? "left-11" : "left-4",
        // Floated state — focused OR filled.
        "peer-focus:top-3 peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-primary",
        "peer-[:not(:placeholder-shown)]:top-3 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold",
        hasIcon && "peer-focus:left-11 peer-[:not(:placeholder-shown)]:left-11",
    );
}

export type FloatingInputProps = Shared &
    Omit<InputHTMLAttributes<HTMLInputElement>, "placeholder">;

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
    ({ label, icon, rightSlot, error, className, readOnly, ...props }, ref) => {
        return (
            <div className={cn(shellBase, shellState(error, readOnly), className)}>
                {icon && (
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary">
                        {icon}
                    </span>
                )}
                <input
                    ref={ref}
                    readOnly={readOnly}
                    placeholder=" "
                    className={cn(
                        "peer h-14 w-full rounded-2xl bg-transparent px-4 pt-5 pb-1.5 text-sm text-foreground outline-none",
                        icon && "pl-11",
                        rightSlot && "pr-11",
                        readOnly && "cursor-default text-muted-foreground",
                    )}
                    {...props}
                />
                <label className={labelClasses(!!icon)}>{label}</label>
                {rightSlot && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>
                )}
            </div>
        );
    },
);
FloatingInput.displayName = "FloatingInput";

export type FloatingTextareaProps = Shared &
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "placeholder">;

export const FloatingTextarea = forwardRef<HTMLTextAreaElement, FloatingTextareaProps>(
    ({ label, error, className, readOnly, rows = 4, ...props }, ref) => {
        return (
            <div className={cn(shellBase, shellState(error, readOnly), className)}>
                <textarea
                    ref={ref}
                    readOnly={readOnly}
                    placeholder=" "
                    rows={rows}
                    className={cn(
                        "peer w-full resize-none rounded-2xl bg-transparent px-4 pt-6 pb-2 text-sm text-foreground outline-none",
                        readOnly && "cursor-default text-muted-foreground",
                    )}
                    {...props}
                />
                <label
                    className={cn(
                        "pointer-events-none absolute left-4 top-4 text-sm text-muted-foreground transition-all duration-200 ease-out",
                        "peer-focus:top-2.5 peer-focus:text-[11px] peer-focus:font-semibold peer-focus:text-primary",
                        "peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:text-[11px] peer-[:not(:placeholder-shown)]:font-semibold",
                    )}
                >
                    {label}
                </label>
            </div>
        );
    },
);
FloatingTextarea.displayName = "FloatingTextarea";
