import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
    AlertCircle,
    Bell,
    CheckCheck,
    CheckCircle2,
    Inbox,
    Info,
    XCircle,
    Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { MainLayout } from "@/components/layout/MainLayout";
import { TooltipWrapper } from "@/components/datatable/common/TooltipWrapper";

import { notificationApi, type NotificationDTO } from "@/api/features/notification.api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

type Filter = "all" | "unread";

const ICONS: Record<NotificationDTO["type"], React.ComponentType<{ size?: number; className?: string }>> = {
    INFO: Info,
    SUCCESS: CheckCircle2,
    WARNING: AlertCircle,
    ERROR: XCircle,
    SYSTEM: Zap,
};

const ICON_CLASS: Record<NotificationDTO["type"], string> = {
    INFO: "text-blue-500",
    SUCCESS: "text-emerald-500",
    WARNING: "text-amber-500",
    ERROR: "text-rose-500",
    SYSTEM: "text-violet-500",
};

const PAGE_SIZE = 20;

/**
 * Full-page notifications inbox. Backed by the same `/api/notifications`
 * endpoints the header dropdown uses — invalidates the shared query so
 * `markAsRead` here updates the unread badge in the dropdown without a
 * manual refresh.
 *
 * UX:
 *   - Filter tabs (All / Unread)
 *   - Click row → mark-read + navigate to `actionUrl` if present
 *   - "Mark all as read" button
 *   - Infinite-ish: loads N pages on demand (no virtualisation — list
 *     rarely exceeds a few hundred rows for a single user)
 */
export default function NotificationsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [filter, setFilter] = useState<Filter>("all");
    const [items, setItems] = useState<NotificationDTO[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchPage = useCallback(
        async (pageIndex: number, mode: Filter, replace: boolean) => {
            setLoading(true);
            setError(null);
            try {
                const res =
                    mode === "unread"
                        ? await notificationApi.getUnread(pageIndex, PAGE_SIZE)
                        : await notificationApi.getAll(pageIndex, PAGE_SIZE);
                setItems((prev) =>
                    replace ? res.content : [...prev, ...res.content],
                );
                setPage(res.number);
                setTotalPages(res.totalPages);
            } catch (err) {
                logger.error("Failed to load notifications", err);
                setError("Không tải được thông báo. Vui lòng thử lại.");
            } finally {
                setLoading(false);
            }
        },
        [],
    );

    // Reload from page 0 whenever the filter changes.
    useEffect(() => {
        setItems([]);
        setPage(0);
        setTotalPages(1);
        void fetchPage(0, filter, true);
    }, [filter, fetchPage]);

    const handleClick = async (n: NotificationDTO) => {
        if (!n.isRead) {
            try {
                await notificationApi.markAsRead(n.id);
                setItems((prev) =>
                    prev.map((it) =>
                        it.id === n.id ? { ...it, isRead: true } : it,
                    ),
                );
                // Refresh badge + dropdown counts everywhere.
                queryClient.invalidateQueries({
                    queryKey: ["notifications-unread-count"],
                });
            } catch (err) {
                logger.warn("markAsRead failed", err);
            }
        }
        if (n.actionUrl) navigate(n.actionUrl);
    };

    const handleMarkAllRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setItems((prev) => prev.map((it) => ({ ...it, isRead: true })));
            queryClient.invalidateQueries({
                queryKey: ["notifications-unread-count"],
            });
        } catch (err) {
            logger.warn("markAllAsRead failed", err);
        }
    };

    const hasMore = page + 1 < totalPages;
    const unreadCount = useMemo(
        () => items.filter((n) => !n.isRead).length,
        [items],
    );

    return (
        <MainLayout pathName={{ "/notifications": "Thông báo" }}>
            <div className="max-w-3xl mx-auto w-full space-y-4">
                {/* ── Header ────────────────────────────────────────────── */}
                <header className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Bell size={20} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Thông báo
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {unreadCount > 0
                                ? `${unreadCount} chưa đọc trong trang hiện tại`
                                : "Tất cả đã đọc"}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <TooltipWrapper content="Đánh dấu tất cả đã đọc">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleMarkAllRead}
                                className="gap-1.5"
                            >
                                <CheckCheck size={14} />
                                <span className="hidden sm:inline">
                                    Đánh dấu đã đọc
                                </span>
                            </Button>
                        </TooltipWrapper>
                    )}
                </header>

                {/* ── Filter tabs ───────────────────────────────────────── */}
                <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-muted">
                    {(["all", "unread"] as const).map((f) => (
                        <button
                            key={f}
                            type="button"
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-3 h-7 text-xs font-medium rounded transition-colors cursor-pointer",
                                filter === f
                                    ? "bg-background text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground",
                            )}
                        >
                            {f === "all" ? "Tất cả" : "Chưa đọc"}
                        </button>
                    ))}
                </div>

                {/* ── List ──────────────────────────────────────────────── */}
                {error && (
                    <Card className="p-4 border-destructive/30 text-destructive text-sm">
                        {error}
                    </Card>
                )}

                {!loading && items.length === 0 && !error && (
                    <Card className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                        <Inbox size={32} className="opacity-40" />
                        <p className="text-sm">
                            {filter === "unread"
                                ? "Không có thông báo chưa đọc"
                                : "Chưa có thông báo nào"}
                        </p>
                    </Card>
                )}

                {items.length > 0 && (
                    <ScrollHintContainer
                        axis="vertical"
                        className="max-h-[60vh] rounded-lg border bg-card"
                        viewportClassName="divide-y"
                    >
                        {items.map((n) => (
                            <NotificationRow
                                key={n.id}
                                notification={n}
                                onClick={() => handleClick(n)}
                            />
                        ))}
                    </ScrollHintContainer>
                )}

                {hasMore && (
                    <div className="flex justify-center">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={loading}
                            onClick={() => fetchPage(page + 1, filter, false)}
                        >
                            {loading ? "Đang tải…" : "Xem thêm"}
                        </Button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

// ─── Row ────────────────────────────────────────────────────────────────────
function NotificationRow({
    notification: n,
    onClick,
}: {
    notification: NotificationDTO;
    onClick: () => void;
}) {
    const Icon = ICONS[n.type] ?? Info;
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 cursor-pointer",
                !n.isRead && "bg-primary/[0.03]",
            )}
        >
            <span
                className={cn(
                    "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0",
                    ICON_CLASS[n.type],
                )}
            >
                <Icon size={15} />
            </span>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p
                        className={cn(
                            "text-sm truncate",
                            !n.isRead && "font-semibold",
                        )}
                    >
                        {n.title}
                    </p>
                    {!n.isRead && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                    {n.message}
                </p>
                <p className="text-[10px] text-muted-foreground/70 mt-1 tabular-nums">
                    {new Date(n.createdAt).toLocaleString("vi-VN")}
                </p>
            </div>
        </button>
    );
}
