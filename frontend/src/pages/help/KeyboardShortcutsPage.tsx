import { useMemo, useState } from "react";
import { Keyboard, Search, X } from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Kbd } from "@/components/common/KeyboardShortcutsDialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
    IS_MAC,
    MOD_KEY,
    SHORTCUT_GROUPS,
    type ShortcutGroup,
} from "@/lib/keyboard-shortcuts";

/**
 * Full keyboard shortcuts reference page.
 *
 * Reads from the same `SHORTCUT_GROUPS` registry as the popup dialog so
 * the two stay in sync. Adds:
 *   - inline filter (matches group title + item label + description)
 *   - group cards with icon + description (vs the dialog's compact rows)
 *   - platform notice (Mac vs Win/Linux modifier key)
 */
export default function KeyboardShortcutsPage() {
    const [query, setQuery] = useState("");

    const filtered = useMemo<ShortcutGroup[]>(() => {
        const q = query.trim().toLowerCase();
        if (!q) return SHORTCUT_GROUPS;

        const matches = (s: string) => s.toLowerCase().includes(q);

        return SHORTCUT_GROUPS.map((g) => {
            if (matches(g.title)) return g;
            const items = g.items.filter(
                (i) => matches(i.label) || (i.description && matches(i.description)),
            );
            if (items.length === 0) return null;
            return { ...g, items };
        }).filter((g): g is ShortcutGroup => g !== null);
    }, [query]);

    const hasResults = filtered.some((g) => g.items.length > 0);

    return (
        <MainLayout pathName={{ "/help/shortcuts": "Phím tắt" }}>
            <div className="max-w-4xl mx-auto w-full space-y-6">
                {/* ─── Header ──────────────────────────────────────────── */}
                <header className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Keyboard size={20} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Phím tắt
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Mọi phím tắt được hỗ trợ trong ứng dụng. Bấm{" "}
                                <Kbd>?</Kbd> ở bất kỳ đâu để mở popup tham khảo nhanh.
                            </p>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                        Hệ điều hành phát hiện:{" "}
                        <span className="font-medium text-foreground">
                            {IS_MAC ? "macOS" : "Windows / Linux"}
                        </span>{" "}
                        — phím modifier hiển thị là{" "}
                        <Kbd>{MOD_KEY}</Kbd>.
                    </div>
                </header>

                {/* ─── Search ──────────────────────────────────────────── */}
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Tìm phím tắt theo tên hoặc mô tả…"
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

                {/* ─── Empty state ─────────────────────────────────────── */}
                {!hasResults && (
                    <Card>
                        <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                            <Search size={32} className="text-muted-foreground/50" />
                            <p className="text-sm text-muted-foreground">
                                Không tìm thấy phím tắt nào khớp với{" "}
                                <span className="font-medium text-foreground">
                                    "{query}"
                                </span>
                            </p>
                        </CardContent>
                    </Card>
                )}

                {/* ─── Groups ──────────────────────────────────────────── */}
                <div className="grid gap-4 md:grid-cols-2">
                    {filtered.map((group) => (
                        <ShortcutGroupCard key={group.id} group={group} />
                    ))}
                </div>
            </div>
        </MainLayout>
    );
}

// ─── Group card ────────────────────────────────────────────────────────────
function ShortcutGroupCard({ group }: { group: ShortcutGroup }) {
    const Icon = group.icon;
    const hasOnlyProse = group.items.every((i) => i.keys.length === 0);

    return (
        <Card className="h-fit">
            <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                        <Icon size={14} />
                    </span>
                    {group.title}
                </CardTitle>
                {group.description && (
                    <p className="text-xs text-muted-foreground">
                        {group.description}
                    </p>
                )}
            </CardHeader>
            <CardContent>
                <ul className="space-y-3">
                    {group.items.map((item) => (
                        <li key={item.label} className="space-y-1">
                            <div
                                className={
                                    hasOnlyProse
                                        ? "flex flex-col gap-1"
                                        : "flex items-center justify-between gap-3"
                                }
                            >
                                <span className="text-sm text-foreground">
                                    {item.label}
                                </span>
                                {item.keys.length > 0 && (
                                    <span className="flex items-center gap-1 shrink-0">
                                        {item.keys.map((k, i) => (
                                            <Kbd key={i}>{k}</Kbd>
                                        ))}
                                    </span>
                                )}
                            </div>
                            {item.description && (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {item.description}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}
