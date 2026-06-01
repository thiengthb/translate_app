import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    FileEdit,
    FilePlus,
    FileX,
    Filter as FilterIcon,
    Search,
    ShieldCheck,
    X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { MainLayout } from "@/components/layout/MainLayout";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";

import { auditLogApi, type AuditLogDTO } from "@/api/features/audit.api";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";

const PAGE_SIZE = 20;

const ACTION_META: Record<
    AuditLogDTO["action"],
    {
        label: string;
        Icon: React.ComponentType<{ size?: number; className?: string }>;
        className: string;
    }
> = {
    CREATE: { label: "Tạo", Icon: FilePlus, className: "text-emerald-600 bg-emerald-500/10" },
    UPDATE: { label: "Sửa", Icon: FileEdit, className: "text-blue-600 bg-blue-500/10" },
    DELETE: { label: "Xóa", Icon: FileX, className: "text-rose-600 bg-rose-500/10" },
    READ: { label: "Đọc", Icon: FileEdit, className: "text-muted-foreground bg-muted" },
};

/**
 * Audit log explorer. Reads from `/api/audit-logs` (requires `AUDIT_READ`).
 *
 * Light-weight UX vs a full ProTable:
 *   - Server pagination (Pageable from BE), no client-side virtualisation
 *   - Filter by entity name + user email (client-side over the page —
 *     server endpoints exist but a multi-filter UI here would dwarf the
 *     usefulness; users typically scan rather than query)
 *   - Click row → expand to show diff + before/after JSON
 */
export default function AuditLogPage() {
    const [items, setItems] = useState<AuditLogDTO[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [expandedId, setExpandedId] = useState<number | null>(null);

    const fetchPage = useCallback(async (pageIndex: number) => {
        setLoading(true);
        setError(null);
        try {
            const res = await auditLogApi.getAll(pageIndex, PAGE_SIZE);
            setItems(res.content);
            setPage(res.number);
            setTotalPages(res.totalPages);
            setTotalElements(res.totalElements);
            setExpandedId(null);
        } catch (err) {
            logger.error("Failed to load audit logs", err);
            setError("Không tải được audit log. Vui lòng kiểm tra quyền AUDIT_READ.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchPage(0);
    }, [fetchPage]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (it) =>
                it.entityName.toLowerCase().includes(q) ||
                (it.userEmail ?? "").toLowerCase().includes(q),
        );
    }, [items, query]);

    return (
        <MainLayout pathName={{ "/audit-logs": "Audit Log" }}>
            <div className="w-full space-y-4">
                {/* ── Header ────────────────────────────────────────────── */}
                <header className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <ShieldCheck size={20} />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Audit Log
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            Theo dõi tất cả thay đổi entity:{" "}
                            <span className="font-medium text-foreground tabular-nums">
                                {totalElements}
                            </span>{" "}
                            log
                        </p>
                    </div>
                </header>

                {/* ── Filter ─────────────────────────────────────────────── */}
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Lọc theo tên entity hoặc email user…"
                        className="h-10 pl-9 pr-9"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            aria-label="Clear"
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* ── Body ───────────────────────────────────────────────── */}
                {error && (
                    <Card className="p-4 border-destructive/30 text-destructive text-sm">
                        {error}
                    </Card>
                )}

                {!loading && filtered.length === 0 && !error && (
                    <Card className="flex flex-col items-center py-16 gap-3 text-muted-foreground">
                        <FilterIcon size={32} className="opacity-40" />
                        <p className="text-sm">
                            {query
                                ? `Không khớp "${query}" trong trang hiện tại`
                                : "Chưa có log nào"}
                        </p>
                    </Card>
                )}

                {filtered.length > 0 && (
                    <ScrollHintContainer
                        axis="vertical"
                        className="max-h-[60vh] rounded-lg border bg-card"
                        viewportClassName="divide-y"
                    >
                        {filtered.map((log) => (
                            <AuditRow
                                key={log.id}
                                log={log}
                                expanded={expandedId === log.id}
                                onToggle={() =>
                                    setExpandedId((id) =>
                                        id === log.id ? null : log.id,
                                    )
                                }
                            />
                        ))}
                    </ScrollHintContainer>
                )}

                {/* ── Pagination ─────────────────────────────────────────── */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground tabular-nums">
                            Trang <span className="text-foreground font-semibold">{page + 1}</span>{" "}
                            / {totalPages}
                        </span>
                        <div className="flex items-center gap-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || page === 0}
                                onClick={() => fetchPage(page - 1)}
                                className="h-8 gap-1"
                            >
                                <ChevronLeft size={14} />
                                Trước
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || page + 1 >= totalPages}
                                onClick={() => fetchPage(page + 1)}
                                className="h-8 gap-1"
                            >
                                Sau
                                <ChevronRight size={14} />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

// ─── Row ────────────────────────────────────────────────────────────────────
function AuditRow({
    log,
    expanded,
    onToggle,
}: {
    log: AuditLogDTO;
    expanded: boolean;
    onToggle: () => void;
}) {
    const meta = ACTION_META[log.action] ?? ACTION_META.UPDATE;
    const Icon = meta.Icon;

    return (
        <div>
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 cursor-pointer"
            >
                <span
                    className={cn(
                        "mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full shrink-0",
                        meta.className,
                    )}
                >
                    <Icon size={15} />
                </span>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">
                            {meta.label}
                        </Badge>
                        <span className="font-medium text-sm tabular-nums">
                            {log.entityName} #{log.entityId}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">
                            • {log.userEmail || `User ${log.userId}`}
                        </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/80 mt-1 tabular-nums">
                        {new Date(log.timestamp).toLocaleString("vi-VN")}
                        {log.ipAddress && ` • ${log.ipAddress}`}
                    </p>
                </div>
            </button>
            {expanded && (log.diff || log.beforeData || log.afterData) && (
                <div className="px-4 pb-3 pl-15 space-y-2 bg-muted/30">
                    {log.diff && (
                        <DiffBlock title="Diff" json={log.diff} />
                    )}
                    {log.beforeData && (
                        <DiffBlock
                            title="Trước"
                            json={log.beforeData}
                            tone="rose"
                        />
                    )}
                    {log.afterData && (
                        <DiffBlock
                            title="Sau"
                            json={log.afterData}
                            tone="emerald"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

function DiffBlock({
    title,
    json,
    tone,
}: {
    title: string;
    json: string;
    tone?: "rose" | "emerald";
}) {
    let pretty = json;
    try {
        pretty = JSON.stringify(JSON.parse(json), null, 2);
    } catch {
        // Not JSON — render raw.
    }
    return (
        <div>
            <p
                className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider mb-1",
                    tone === "rose" && "text-rose-600",
                    tone === "emerald" && "text-emerald-600",
                    !tone && "text-muted-foreground",
                )}
            >
                {title}
            </p>
            <pre className="text-[11px] leading-relaxed font-mono bg-background border rounded-md p-2 max-h-48 overflow-auto">
                {pretty}
            </pre>
        </div>
    );
}
