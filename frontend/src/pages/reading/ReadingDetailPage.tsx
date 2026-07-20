import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft, Type, Minus, Plus, AlertCircle, Clock, AlignLeft,
    Hash, ChevronLeft, ChevronRight, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MainLayout } from "@/components/layout/MainLayout";
import { InteractiveSentence } from "@/pages/dictionary/InteractiveSentence";
import { readingApi, type ReadingPassage } from "@/api/features/reading.api";
import { passageStats, levelStyle, categoryOf } from "./readingMeta";
import { PassagePlayer } from "./PassagePlayer";

const FONT_MIN = 16;
const FONT_MAX = 40;
const FONT_STEP = 2;

/**
 * Trang đọc một bài: hero (tiêu đề + cấp độ + chỉ số), thanh công cụ dính
 * (đọc cả bài / furigana / cỡ chữ), cột đọc thoáng với InteractiveSentence
 * (chạm để tra & lưu sổ tay) và điều hướng bài trước/sau.
 */
export default function ReadingDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [furigana, setFurigana] = useState(true);
    const [fontSize, setFontSize] = useState(22);

    const { data, isLoading, isError } = useQuery({
        queryKey: ["reading-passage", id],
        queryFn: () => readingApi.getById(id!),
        enabled: !!id,
    });

    // Danh sách (chia sẻ cache với trang list) → tính bài trước/sau.
    const { data: list } = useQuery({
        queryKey: ["reading-passages"],
        queryFn: () => readingApi.getPage({ page: 0, size: 100, sort: "sortOrder,asc" }),
    });
    const all = list?.content ?? [];
    const idx = all.findIndex((p) => String(p.id) === id);
    const prev = idx > 0 ? all[idx - 1] : null;
    const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

    const paragraphs = useMemo(
        () => (data?.content ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
        [data?.content],
    );
    const st = levelStyle(data?.level);
    const cat = categoryOf(data?.category);
    const CatIcon = cat.icon;
    const stats = passageStats(data?.content);

    return (
        <MainLayout pathName={{ "/reader": "Đọc hiểu" }} parentCrumb={{ href: "/reader", title: "Đọc hiểu" }}>
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
            <Button asChild variant="ghost" size="sm" className="mb-3 gap-1.5 text-muted-foreground">
                <Link to="/reader"><ArrowLeft className="h-4 w-4" /> Danh sách bài đọc</Link>
            </Button>

            {isLoading ? (
                <div className="space-y-3 animate-pulse">
                    <div className="h-28 rounded-2xl bg-muted/60" />
                    <div className="h-12 rounded-lg bg-muted/50" />
                    <div className="h-96 rounded-2xl bg-muted/40" />
                </div>
            ) : isError || !data ? (
                <Card className="flex flex-col items-center gap-2 px-4 py-20 text-center">
                    <AlertCircle className="h-8 w-8 text-muted-foreground/60" />
                    <p className="text-sm font-medium text-foreground">Không tìm thấy bài đọc.</p>
                    <Button asChild variant="outline" size="sm" className="mt-2">
                        <Link to="/reader">Về danh sách</Link>
                    </Button>
                </Card>
            ) : (
                <>
                    {/* ── Hero ── */}
                    {data.imageUrl ? (
                        /* Có ảnh: banner kiểu header bài báo, tiêu đề phủ lên ảnh. */
                        <div className="overflow-hidden rounded-2xl border shadow-sm">
                            <div className="relative">
                                <img
                                    src={data.imageUrl}
                                    alt={data.title}
                                    className="h-52 w-full object-cover sm:h-72"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="gap-1 border-white/30 bg-black/30 text-[11px] font-semibold text-white backdrop-blur-sm">
                                            <CatIcon className="h-3.5 w-3.5" />
                                            {cat.key}
                                        </Badge>
                                        {data.level && (
                                            <Badge variant="outline" className="border-white/30 bg-black/30 text-xs font-bold text-white backdrop-blur-sm">
                                                {data.level}
                                            </Badge>
                                        )}
                                    </div>
                                    <h1 className="text-2xl font-bold leading-tight text-white drop-shadow-sm sm:text-3xl">{data.title}</h1>
                                </div>
                            </div>
                            <div className="bg-card p-5">
                                {data.summary && <p className="text-sm text-muted-foreground">{data.summary}</p>}
                                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                    <span className="inline-flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5" />{stats.sentences} câu</span>
                                    <span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{stats.chars} chữ</span>
                                    <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />~{stats.minutes} phút đọc</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Không có ảnh: hero gradient màu chủ đề. */
                        <div className={`overflow-hidden rounded-2xl border border-l-4 bg-gradient-to-br from-primary/[0.07] to-transparent p-5 ${cat.accent}`}>
                            <Badge variant="outline" className={`mb-2 w-fit gap-1 text-[11px] font-semibold ${cat.badge}`}>
                                <CatIcon className="h-3.5 w-3.5" />
                                {cat.key}
                            </Badge>
                            <div className="flex items-start gap-2">
                                <h1 className="min-w-0 flex-1 text-2xl font-bold leading-tight text-foreground">{data.title}</h1>
                                {data.level && (
                                    <Badge variant="outline" className={`shrink-0 text-xs font-bold ${st?.badge ?? ""}`}>{data.level}</Badge>
                                )}
                            </div>
                            {data.summary && <p className="mt-1.5 text-sm text-muted-foreground">{data.summary}</p>}
                            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5"><AlignLeft className="h-3.5 w-3.5" />{stats.sentences} câu</span>
                                <span className="inline-flex items-center gap-1.5"><Hash className="h-3.5 w-3.5" />{stats.chars} chữ</span>
                                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />~{stats.minutes} phút đọc</span>
                            </div>
                        </div>
                    )}

                    {/* ── Thanh công cụ (dính) ── */}
                    <div className="sticky top-2 z-10 mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/85 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/70">
                        <PassagePlayer text={data.content} />

                        <div className="flex items-center gap-2">
                            <Switch id="furigana" checked={furigana} onCheckedChange={setFurigana} />
                            <Label htmlFor="furigana" className="cursor-pointer text-sm">Furigana</Label>
                        </div>

                        <div className="ml-auto flex items-center gap-0.5">
                            <Type className="mr-0.5 h-4 w-4 text-muted-foreground" />
                            <Button
                                variant="ghost" size="icon-sm"
                                onClick={() => setFontSize((s) => Math.max(FONT_MIN, s - FONT_STEP))}
                                disabled={fontSize <= FONT_MIN}
                                title="Chữ nhỏ hơn"
                            >
                                <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-7 text-center text-xs tabular-nums text-muted-foreground">{fontSize}</span>
                            <Button
                                variant="ghost" size="icon-sm"
                                onClick={() => setFontSize((s) => Math.min(FONT_MAX, s + FONT_STEP))}
                                disabled={fontSize >= FONT_MAX}
                                title="Chữ to hơn"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* ── Vùng đọc ── */}
                    <Card className="mt-3 px-6 py-8 sm:px-9 sm:py-10">
                        <div
                            className="space-y-5 text-foreground"
                            style={{ fontSize: `${fontSize}px`, lineHeight: furigana ? 2.5 : 2.1 }}
                        >
                            {paragraphs.map((line, i) => (
                                <p key={i} className="leading-[inherit] tracking-wide">
                                    <InteractiveSentence text={line} furigana={furigana} />
                                </p>
                            ))}
                        </div>
                    </Card>

                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Chạm vào một từ để xem nghĩa, nghe phát âm và lưu vào sổ tay.
                    </p>

                    {/* ── Điều hướng bài trước / sau ── */}
                    {(prev || next) && (
                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                            {prev ? <NavCard passage={prev} dir="prev" /> : <span className="hidden sm:block" />}
                            {next && <NavCard passage={next} dir="next" />}
                        </div>
                    )}
                </>
            )}
        </div>
        </MainLayout>
    );
}

/**
 * Thẻ chuyển bài trước/sau — đồng bộ phong cách thẻ ở trang danh sách: icon
 * tròn (đổi sang màu primary khi hover), nhãn hướng, tiêu đề và nhãn chuyên mục
 * màu. {@code dir="next"} thì đảo chiều để icon nằm bên phải, chữ canh phải.
 */
function NavCard({ passage, dir }: { passage: ReadingPassage; dir: "prev" | "next" }) {
    const isPrev = dir === "prev";
    const cat = categoryOf(passage.category);
    const CatIcon = cat.icon;

    return (
        <Link
            to={`/reader/${passage.id}`}
            className={`group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md ${
                isPrev ? "" : "flex-row-reverse text-right sm:col-start-2"
            }`}
        >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-muted/50 text-muted-foreground transition-colors group-hover:border-transparent group-hover:bg-primary group-hover:text-primary-foreground">
                {isPrev
                    ? <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-0.5" />
                    : <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />}
            </span>
            <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    {isPrev ? "Bài trước" : "Bài tiếp theo"}
                </div>
                <div className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {passage.title}
                </div>
                <div className={`mt-1 flex items-center ${isPrev ? "" : "justify-end"}`}>
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${cat.text}`}>
                        <CatIcon className="h-3 w-3" />
                        {cat.key}
                    </span>
                </div>
            </div>
        </Link>
    );
}