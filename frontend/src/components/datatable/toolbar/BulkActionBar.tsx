import { Download, Pencil, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PermissionGate } from "@/components/PermissionGate";

interface BulkActionBarProps {
    selectedCount: number;
    total: number;
    onClearSelection: () => void;
    onBulkDelete?: () => void;
    onBulkEdit?: () => void;
    onBulkExport?: () => void;
    deletePermission?: string;
    editPermission?: string;
    exportPermission?: string;
}

/**
 * Sticky floating action bar that slides in from the bottom when one or more
 * rows are selected. Mirrors Linear / Notion table UX — keeps bulk operations
 * out of the toolbar until needed.
 */
export function BulkActionBar({
    selectedCount,
    total,
    onClearSelection,
    onBulkDelete,
    onBulkEdit,
    onBulkExport,
    deletePermission,
    editPermission,
    exportPermission,
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className="fixed inset-x-0 bottom-6 z-40 flex justify-center pointer-events-none px-4">
            <div
                className="pointer-events-auto flex items-center gap-1 rounded-2xl border bg-popover/95 backdrop-blur-md shadow-2xl px-2 py-2
                    animate-in fade-in-0 slide-in-from-bottom-4 duration-200"
                role="toolbar"
                aria-label="Bulk actions"
            >
                <div className="flex items-center gap-2 pl-2 pr-3 border-r border-border/60">
                    <span className="inline-flex h-6 min-w-6 px-1.5 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold tabular-nums">
                        {selectedCount}
                    </span>
                    <span className="text-sm text-foreground">
                        {selectedCount === total ? "tất cả đã chọn" : "đã chọn"}
                    </span>
                </div>

                {onBulkEdit && (
                    <PermissionGate permission={editPermission}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={onBulkEdit}
                        >
                            <Pencil size={14} />
                            Sửa
                        </Button>
                    </PermissionGate>
                )}

                {onBulkExport && (
                    <PermissionGate permission={exportPermission}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                            onClick={onBulkExport}
                        >
                            <Download size={14} />
                            Export
                        </Button>
                    </PermissionGate>
                )}

                {onBulkDelete && (
                    <PermissionGate permission={deletePermission}>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-600"
                            onClick={onBulkDelete}
                        >
                            <Trash2 size={14} />
                            Xóa
                        </Button>
                    </PermissionGate>
                )}

                <div className="border-l border-border/60 pl-1 ml-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={onClearSelection}
                        aria-label="Clear selection"
                    >
                        <X size={14} />
                    </Button>
                </div>
            </div>
        </div>
    );
}
