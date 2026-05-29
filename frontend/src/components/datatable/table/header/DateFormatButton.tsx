import { CalendarClock } from "lucide-react";

import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";
import {
    DATE_FORMAT_LABELS,
    type DateFormatKey,
} from "../cell/CellRenderer";

interface DateFormatButtonProps {
    fieldName: string;
    dateFormat: DateFormatKey;
    onCycle: (fieldName: string) => void;
    onPointerDownCapture?: (e: React.PointerEvent) => void;
}

/** Tiny "cycle date format" button shown on date-column headers. */
export function DateFormatButton({
    fieldName,
    dateFormat,
    onCycle,
    onPointerDownCapture,
}: DateFormatButtonProps) {
    const currentLabel = DATE_FORMAT_LABELS[dateFormat];
    return (
        <TooltipWrapper content={`Định dạng: ${currentLabel} — Click để đổi`}>
            <button
                type="button"
                className="inline-flex items-center shrink-0 rounded p-0.5 text-muted-foreground/50 opacity-0 group-hover/header:opacity-100 hover:text-foreground hover:bg-muted transition-all cursor-pointer"
                onPointerDown={onPointerDownCapture}
                onClick={(e) => {
                    e.stopPropagation();
                    onCycle(fieldName);
                }}
                data-no-row-click
            >
                <CalendarClock className="h-3.5 w-3.5" />
            </button>
        </TooltipWrapper>
    );
}
