import { Eye, MoreHorizontal, Pen, Trash2 } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import { PermissionGate } from "@/components/PermissionGate";

interface RowActionsProps {
    row: any;
    onView: (row: any) => void;
    onEdit: (row: any) => void;
    onDelete: (row: any) => void;
    viewPermission?: string;
    editPermission?: string;
    deletePermission?: string;
}

/**
 * Single kebab trigger that fans out to view / edit / delete. Collapsing the
 * three icon buttons into one dropdown is the only way to keep the action
 * column at a tiny fixed width without buttons overlapping — and it scales
 * trivially if more row actions get added later.
 */
export function RowActions({
    row,
    onView,
    onEdit,
    onDelete,
    viewPermission,
    editPermission,
    deletePermission,
}: RowActionsProps) {
    return (
        <DropdownMenu>
            <TooltipWrapper content="Hành động">
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label="Hành động"
                        className="inline-flex items-center justify-center h-7 w-7 shrink-0 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                        data-no-row-click
                    >
                        <MoreHorizontal size={15} />
                    </button>
                </DropdownMenuTrigger>
            </TooltipWrapper>
            <DropdownMenuContent align="end" className="w-40">
                <PermissionGate permission={viewPermission}>
                    <DropdownMenuItem
                        onSelect={() => onView(row)}
                        className="gap-2 text-sm"
                    >
                        <Eye size={13} />
                        Xem chi tiết
                    </DropdownMenuItem>
                </PermissionGate>
                <PermissionGate permission={editPermission}>
                    <DropdownMenuItem
                        onSelect={() => onEdit(row)}
                        className="gap-2 text-sm"
                    >
                        <Pen size={13} />
                        Chỉnh sửa
                    </DropdownMenuItem>
                </PermissionGate>
                <PermissionGate permission={deletePermission}>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => onDelete(row)}
                        className="gap-2 text-sm text-rose-600 focus:text-rose-600 focus:bg-rose-500/10"
                    >
                        <Trash2 size={13} />
                        Xóa
                    </DropdownMenuItem>
                </PermissionGate>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
