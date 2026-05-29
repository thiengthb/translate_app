import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns: number;
    showSelection?: boolean;
    showIndex?: boolean;
    showActions?: boolean;
    showExpand?: boolean;
}

/**
 * Skeleton rows matching the table column layout. Pads cells with the
 * same colgroup widths so the layout doesn't shift when real data lands.
 */
export function TableSkeleton({
    rows = 8,
    columns,
    showSelection = true,
    showIndex = true,
    showActions = true,
    showExpand = false,
}: TableSkeletonProps) {
    return (
        <TableBody>
            {Array.from({ length: rows }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="odd:bg-accent/30 even:bg-background">
                    {showExpand && (
                        <TableCell className="!p-0 text-center">
                            <Skeleton className="h-4 w-4 mx-auto" />
                        </TableCell>
                    )}
                    {showSelection && (
                        <TableCell className="!px-1 text-center">
                            <Skeleton className="h-4 w-4 mx-auto" />
                        </TableCell>
                    )}
                    {showIndex && (
                        <TableCell className="!px-1 text-center">
                            <Skeleton className="h-3 w-5 mx-auto" />
                        </TableCell>
                    )}
                    {Array.from({ length: columns }).map((_, j) => (
                        <TableCell key={`cell-${i}-${j}`}>
                            <Skeleton
                                className="h-4"
                                style={{ width: `${50 + ((i * 13 + j * 17) % 40)}%` }}
                            />
                        </TableCell>
                    ))}
                    {showActions && (
                        <TableCell>
                            <div className="flex gap-1.5">
                                <Skeleton className="h-7 w-7" />
                                <Skeleton className="h-7 w-7" />
                                <Skeleton className="h-7 w-7" />
                            </div>
                        </TableCell>
                    )}
                </TableRow>
            ))}
        </TableBody>
    );
}
