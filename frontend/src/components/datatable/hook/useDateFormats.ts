import { useCallback, useState } from "react";
import {
    DATE_FORMAT_CYCLE,
    type DateFormatKey,
} from "../table/cell/CellRenderer";

/**
 * Per-column date format override. Cycle through DATE_FORMAT_CYCLE on each
 * call — used by the date-column header to flip between datetime / date /
 * relative / etc. without re-querying.
 */
export function useDateFormats() {
    const [formats, setFormats] = useState<Record<string, DateFormatKey>>({});

    const cycle = useCallback((fieldName: string) => {
        setFormats((prev) => {
            const current = prev[fieldName] ?? "datetime";
            const idx = DATE_FORMAT_CYCLE.indexOf(current);
            const next = DATE_FORMAT_CYCLE[(idx + 1) % DATE_FORMAT_CYCLE.length];
            return { ...prev, [fieldName]: next };
        });
    }, []);

    return { formats, cycle, setFormats };
}
