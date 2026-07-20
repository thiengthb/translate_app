import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    BookOpenText, Loader2, ArrowRight, Inbox, Clock, AlignLeft,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MainLayout } from "@/components/layout/MainLayout";
import { readingApi, type ReadingPassage } from "@/api/features/reading.api";
import {
    passageStats, levelStyle, categoryOf, READING_CATEGORIES, UNCATEGORIZED,
    type ReadingCategory,
} from "./readingMeta";

/**
 * Trang học viên: thư viện bài đọc hiểu trình bày như một cổng tin tức — khi
 * chưa lọc thì chia thành từng chuyên mục (mỗi chủ đề một dải bài + "Xem tất
 * cả"); khi đã chọn chủ đề/cấp độ thì hiện lưới phẳng. Mỗi thẻ giống một mẩu
 * báo: nhãn chuyên mục màu, tiêu đề lớn, tóm tắt, trích đoạn tiếng Nhật.
 */
export default function ReadingListPage() {
    const [level, setLevel] = useState<string | null>(null);
    const [category, setCategory] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ["reading-passages"],
        queryFn: () => readingApi.getPage({ page: 0, size: 100, sort: "sortOrder,asc" }),
    });

    const passages = data?.content ?? [];
    const levels = Array.from(new Set(passages.map((p) => p.level).filter(Boolean))) as string[];
    // Chủ đề có bài (giữ thứ tự cố định), nối thêm "Chưa phân loại" cuối nếu có bài chưa gán.
    const known = READING_CATEGORIES.filter((c) => passages.some((p) => categoryOf(p.category).key === c.key));
    const hasUncategorized = passages.some((p) => categoryOf(p.category).key === UNCATEGORIZED.key);
    const categories = hasUncategorized ? [...known, UNCATEGORIZED] : known;
    const filtered = passages.filter(
        (p) => (!level || p.level === level) && (!category || categoryOf(p.category).key === category),
    );
    const hasFilter = level !== null || category !== null;

    return (
        <MainLayout pathName={{ "/reader": "Đọc hiểu" }}>
        <div className="mx-auto w-full max-w-6xl px-4 py-6">
            {/* ── Hero ── */}
            <div className="relative mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-primary/[0.04] to-transparent p-6 sm:p-8">
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
                <div className="relative flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                        <BookOpenText className="h-7 w-7" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">Đọc hiểu</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Những bài đọc theo chuyên mục — chạm vào từ để tra nghĩa, hoặc nghe đọc cả bài.
                        </p>
                    </div>
                    {!isLoading && passages.length > 0 && (
                        <div className="ml-auto hidden shrink-0 flex-col items-end sm:flex">
                            <span className="text-3xl font-bold leading-none text-foreground">{passages.length}</span>
                            <span className="text-xs text-muted-foreground">bài đọc</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Thanh lọc ── */}
            {categories.length > 0 && (
                <div className="mb-5 flex flex-wrap items-center gap-1.5">
                    <Button
                        size="sm"
                        variant={category === null ? "default" : "outline"}
                        onClick={() => setCategory(null)}
                        className="rounded-full"
                    >
                        Tất cả chủ đề
                    </Button>
                    {categories.map((c) => {
                        const Icon = c.icon;
                        const active = category === c.key;
                        return (
                            <Button
                                key={c.key}
                                size="sm"
                                variant="outline"
                                onClick={() => setCategory(active ? null : c.key)}
                                className={`gap-1.5 rounded-full transition-colors ${
                                    active ? `${c.bar} border-transparent text-white shadow-sm hover:opacity-90` : c.text
                                }`}
                            >
                                <Icon className="h-3.5 w-3.5" />
                                {c.key}
                            </Button>
                        );
                    })}
                </div>
            )}

            {levels.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-1.5">
                    <span className="mr-1 text-xs font-medium text-muted-foreground">Cấp độ</span>
                    <Button
                        size="sm"
                        variant={level === null ? "secondary" : "ghost"}
                        onClick={() => setLevel(null)}
                        className="h-7 rounded-full px-3 text-xs"
                    >
                        Tất cả
                    </Button>
                    {levels.map((lv) => {
                        const st = levelStyle(lv);
                        const active = level === lv;
                        return (
                            <Button
                                key={lv}
                                size="sm"
                                variant={active ? "secondary" : "ghost"}
                                onClick={() => setLevel(active ? null : lv)}
                                className={`h-7 rounded-full px-3 text-xs font-bold ${!active && st ? st.text : ""}`}
                            >
                                {lv}
                            </Button>
                        );
                    })}
                </div>
            )}

            {/* ── Nội dung ── */}
            {isLoading ? (
                <ListSkeleton />
            ) : filtered.length === 0 ? (
                <EmptyState />
            ) : hasFilter ? (
                <PassageGrid items={filtered} />
            ) : (
                /* Tổng quan: từng chuyên mục một dải bài. */
                <div className="space-y-9">
                    {categories.map((cat) => {
                        const items = passages.filter((p) => categoryOf(p.category).key === cat.key);
                        if (items.length === 0) return null;
                        return (
                            <CategorySection
                                key={cat.key}
                                cat={cat}
                                items={items}
                                onSeeAll={() => setCategory(cat.key)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
        </MainLayout>
    );
}

/** Một chuyên mục trong trang tổng quan: tiêu đề + tối đa 4 bài + nút xem tất cả. */
function CategorySection({
    cat, items, onSeeAll,
}: { cat: ReadingCategory; items: ReadingPassage[]; onSeeAll: () => void }) {
    const Icon = cat.icon;
    const shown = items.slice(0, 4);
    return (
        <section>
            <div className="mb-3 flex items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${cat.badge}`}>
                    <Icon className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-foreground">{cat.key}</h2>
                <span className="text-sm text-muted-foreground">{items.length} bài</span>
                {items.length > shown.length && (
                    <Button
                        variant="ghost" size="sm"
                        onClick={onSeeAll}
                        className="ml-auto gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                        Xem tất cả <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>
            <PassageGrid items={shown} />
        </section>
    );
}

function PassageGrid({ items }: { items: ReadingPassage[] }) {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => <PassageCard key={p.id} p={p} />)}
        </div>
    );
}

function PassageCard({ p }: { p: ReadingPassage }) {
    const st = levelStyle(p.level);
    const cat = categoryOf(p.category);
    const CatIcon = cat.icon;
    const stats = passageStats(p.content);

    return (
        <Link to={`/reader/${p.id}`} className="group block h-full">
            <article className="flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5">
                {/* ── Vùng ảnh (ảnh thật hoặc fallback gradient + icon chủ đề) ── */}
                <div className="relative aspect-[16/9] overflow-hidden">
                    {p.imageUrl ? (
                        <img
                            src={p.imageUrl}
                            alt={p.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                    ) : (
                        <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${cat.gradient}`}>
                            <CatIcon className="h-12 w-12 text-white/90" />
                        </div>
                    )}

                    {/* Lớp tối nhẹ dưới đáy để chữ nhãn nổi rõ */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />

                    {/* Nhãn chuyên mục (góc dưới trái) */}
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
                        <CatIcon className="h-3 w-3" />
                        {cat.key}
                    </span>

                    {/* Cấp độ (góc trên phải) */}
                    {p.level && (
                        <Badge variant="outline" className={`absolute right-2 top-2 border-transparent text-[10px] font-bold shadow-sm ${st?.badge ?? "bg-background/90"}`}>
                            {p.level}
                        </Badge>
                    )}
                </div>

                {/* ── Nội dung ── */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="line-clamp-2 font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
                        {p.title}
                    </h3>

                    {p.summary && (
                        <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{p.summary}</p>
                    )}

                    <div className="mt-auto flex items-center gap-3 border-t pt-2.5 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />~{stats.minutes} phút</span>
                        <span className="inline-flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5" />{stats.sentences} câu</span>
                        <span className="ml-auto inline-flex items-center gap-0.5 font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                            Đọc <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                        </span>
                    </div>
                </div>
            </article>
        </Link>
    );
}

function EmptyState() {
    return (
        <Card className="flex flex-col items-center gap-2 px-4 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <Inbox className="h-7 w-7 text-muted-foreground/60" />
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">Chưa có bài đọc nào.</p>
            <p className="max-w-sm text-xs text-muted-foreground">
                Bài đọc do giáo viên/quản trị soạn trong mục “Bài đọc”. Khi có bài, chúng sẽ hiện ở đây.
            </p>
        </Card>
    );
}

function ListSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl border bg-muted/50" />
            ))}
            <div className="col-span-full flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tải bài đọc…
            </div>
        </div>
    );
}