import { ExternalLink, Keyboard } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    SHORTCUTS_PAGE_PATH,
    SHORTCUT_GROUPS,
} from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

/**
 * Quick-reference popup. Reads from the shared `SHORTCUT_GROUPS` so the
 * dialog never drifts from the full docs page. Includes a footer link
 * to the page for users who want longer explanations.
 *
 * The "tips" group is hidden in the dialog — it's prose, not table
 * rows, so it belongs only on the docs page where there's room for it.
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
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard size={18} className="text-primary" />
                        Phím tắt
                    </DialogTitle>
                    <DialogDescription>
                        Danh sách phím tắt được hỗ trợ trong toàn ứng dụng.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {dialogGroups.map((group) => (
                        <section key={group.id}>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                {group.title}
                            </h3>
                            <ul className="space-y-1.5">
                                {group.items.map((s) => (
                                    <li
                                        key={s.label}
                                        className="flex items-center justify-between gap-3 text-sm"
                                    >
                                        <span className="text-foreground">
                                            {s.label}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            {s.keys.map((k, i) => (
                                                <Kbd key={i}>{k}</Kbd>
                                            ))}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </div>

                <DialogFooter className="border-t pt-3 sm:justify-between">
                    <span className="text-xs text-muted-foreground self-center">
                        Bấm <Kbd>?</Kbd> ở bất kỳ đâu để mở lại
                    </span>
                    <Button
                        asChild
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        <Link to={SHORTCUTS_PAGE_PATH}>
                            Xem trang đầy đủ
                            <ExternalLink size={13} />
                        </Link>
                    </Button>
                </DialogFooter>
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
