import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";

interface RefreshIndicatorProps {
    /** Timestamp of the last successful fetch (ms since epoch). */
    lastUpdated: number;
    isFetching: boolean;
    onRefresh: () => void;
}

/**
 * Small indicator showing how long ago data was fetched, plus a manual refresh
 * button. Updates the relative-time label every 10s.
 */
export function RefreshIndicator({ lastUpdated, isFetching, onRefresh }: RefreshIndicatorProps) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 10_000);
        return () => clearInterval(id);
    }, []);

    const relativeLabel = formatRelative(lastUpdated, now);

    return (
        <TooltipWrapper content={`Cập nhật ${relativeLabel} • Click để làm mới`}>
            <Button
                variant="outline"
                size="icon"
                onClick={onRefresh}
                disabled={isFetching}
                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                aria-label="Refresh"
            >
                <RefreshCw
                    size={15}
                    className={isFetching ? "animate-spin" : ""}
                />
            </Button>
        </TooltipWrapper>
    );
}

function formatRelative(then: number, now: number): string {
    if (!then) return "—";
    const diffSec = Math.floor((now - then) / 1000);
    if (diffSec < 5) return "vừa xong";
    if (diffSec < 60) return `${diffSec} giây trước`;
    const minutes = Math.floor(diffSec / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}
