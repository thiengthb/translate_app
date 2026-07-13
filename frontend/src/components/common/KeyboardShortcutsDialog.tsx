import { Keyboard } from "lucide-react";

import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { SHORTCUT_GROUPS } from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Quick-reference popup, opened via the global `?` shortcut. Reads from
 * the shared `SHORTCUT_GROUPS` registry.
 *
 * The body uses `ScrollHintContainer` instead of a raw `overflow-y-auto`:
 * the scrollbar stays hidden and floating chevrons hint when more rows
 * sit below the fold — no jarring scrollbar inside the rounded dialog.
 *
 * The "tips" group is hidden here — it's prose, not table rows, so it
 * doesn't fit this compact row layout.
 */
export function KeyboardShortcutsDialog({
    open,
    onOpenChange,
}: KeyboardShortcutsDialogProps) {
    const dialogGroups = SHORTCUT_GROUPS.filter(
        (g) => g.id !== "tips" && g.items.length > 0,
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
                {/* ── Header ───────────────────────────────────────────── */}
                <DialogHeader className="space-y-1.5 border-b px-6 py-5 text-left">
                    <DialogTitle className="flex items-center gap-3 text-base">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Keyboard size={18} />
                        </span>
                        Phím tắt
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách phím tắt được hỗ trợ trong toàn ứng dụng.
                    </DialogDescription>
                </DialogHeader>

                {/* ── Body (hidden scrollbar + chevron hints) ──────────── */}
                <ScrollHintContainer
                    axis="vertical"
                    className="max-h-[60vh]"
                    viewportClassName="space-y-5 px-6 py-5"
                >
                    {dialogGroups.map((group) => {
                        const Icon = group.icon;
                        return (
                            <section key={group.id}>
                                <div className="mb-2 flex items-center gap-2">
                                    <Icon size={13} className="text-muted-foreground" />
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {group.title}
                                    </h3>
                                </div>
                                <ul className="space-y-0.5 rounded-xl border bg-muted/30 p-1.5">
                                    {group.items.map((s) => (
                                        <li
                                            key={s.label}
                                            className="flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-sm transition-colors hover:bg-background"
                                        >
                                            <span className="text-foreground">
                                                {s.label}
                                            </span>
                                            <span className="flex shrink-0 items-center gap-1">
                                                {s.keys.map((k, i) => (
                                                    <Kbd key={i}>{k}</Kbd>
                                                ))}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        );
                    })}
                </ScrollHintContainer>

                {/* ── Footer ───────────────────────────────────────────── */}
                <div className="flex items-center justify-center gap-2 border-t px-6 py-3">
                    <span className="text-xs text-muted-foreground">
                        Bấm <Kbd>?</Kbd> ở bất kỳ đâu để mở lại
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}

/** Styled `<kbd>` for individual key caps. Exported for reuse on the docs page. */
export function Kbd({ children }: { children: React.ReactNode }) {
    return (
        <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-[11px] font-medium text-foreground tabular-nums">
            {children}
        </kbd>
    );
}
