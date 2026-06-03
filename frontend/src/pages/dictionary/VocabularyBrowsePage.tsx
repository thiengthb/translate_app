import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Layers, BookOpen, ChevronLeft, ChevronRight, Loader2, AlertCircle,
    Search, Star, Pen,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EmptyState } from "@/components/common/EmptyState";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type {
    WordSearchResult, DictionaryKanjiDetail, DictionaryBrowsePage,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { JLPT, JLPT_LEVELS, REP_LABELS, WORD_TYPE_LABELS } from "./dictionaryConstants";

// ══════════════════════════════════════════════════════════════════════
// Từ vựng tổng hợp — duyệt toàn bộ danh sách từ vựng & kanji (phân trang),
// lọc theo level JLPT. Click một mục → /dictionary?q=... để xem chi tiết
// (cùng pattern điều hướng với trang Sổ tay).
// Trạng thái tab/level/trang giữ trong URL query để back/forward và share
// link hoạt động đúng.
// ══════════════════════════════════════════════════════════════════════

type BrowseTab = "vocabulary" | "kanji";

const WORD_PAGE_SIZE  = 20;
const KANJI_PAGE_SIZE = 24;

export default function VocabularyBrowsePage() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    const tab: BrowseTab = searchParams.get("tab") === "kanji" ? "kanji" : "vocabulary";
    const levelParam = searchParams.get("level") ?? "";
    const level = (JLPT_LEVELS as readonly string[]).includes(levelParam) ? levelParam : "";
    const pageParam = parseInt(searchParams.get("page") ?? "1", 10);
    const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam - 1 : 0;

    const [words,   setWords]   = useState<DictionaryBrowsePage<WordSearchResult> | null>(null);
    const [kanjis,  setKanjis]  = useState<DictionaryBrowsePage<DictionaryKanjiDetail> | null>(null);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const req = tab === "kanji"
            ? dictionaryApi.browseKanjis(level || undefined, page, KANJI_PAGE_SIZE)
                .then((d) => { if (!cancelled) { setKanjis(d); setWords(null); } })
            : dictionaryApi.browseWords(level || undefined, page, WORD_PAGE_SIZE)
                .then((d) => { if (!cancelled) { setWords(d); setKanjis(null); } });
        req.catch((e: any) => {
            if (!cancelled) setError(e?.response?.data?.message ?? "Tải danh sách thất bại.");
        }).finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [tab, level, page]);

    // Đổi tab / level → quay về trang 1; đổi trang giữ nguyên tab + level.
    const updateParams = (next: { tab?: BrowseTab; level?: string; page?: number }) => {
        const params: Record<string, string> = {};
        const t = next.tab ?? tab;
        const l = next.level !== undefined ? next.level : level;
        const p = next.page !== undefined ? next.page : 0;
        if (t === "kanji") params.tab = "kanji";
        if (l) params.level = l;
        if (p > 0) params.page = String(p + 1);
        setSearchParams(params);
    };

    const current = tab === "kanji" ? kanjis : words;
    const totalPages = current?.totalPages ?? 0;
    const totalItems = current?.totalItems ?? 0;
    const isEmpty = !loading && !error && current !== null && current.items.length === 0;

    const goWord  = (w: string)  => navigate(`/dictionary?q=${encodeURIComponent(w)}`);
    const goKanji = (ch: string) => navigate(`/dictionary?q=${encodeURIComponent(ch)}&mode=kanji`);

    return (
        <MainLayout pathName={{ "/vocabulary": "Từ vựng tổng hợp" }}>
            <div className="w-full space-y-4">

                {/* ── Hero ── */}
                <div className="relative rounded-2xl border bg-card shadow-sm overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
                    <div className="relative p-4 sm:p-5 space-y-3.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                <Layers className="h-[18px] w-[18px]" />
                            </span>
                            <div className="min-w-0 flex-1">
                                <h1 className="text-base sm:text-lg font-bold leading-tight text-foreground">
                                    Từ vựng tổng hợp
                                </h1>
                                <p className="hidden sm:block text-xs text-muted-foreground">
                                    Toàn bộ từ vựng và kanji trong từ điển, lọc theo level JLPT
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => navigate("/dictionary")} className="gap-1.5 shrink-0">
                                <Search className="h-3.5 w-3.5" />
                                <span className="hidden sm:inline">Tra từ điển</span>
                            </Button>
                        </div>

                        {/* ── Tab pills + level filter ── */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                                <TabPill active={tab === "vocabulary"} onClick={() => updateParams({ tab: "vocabulary", page: 0 })}>
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Từ vựng
                                </TabPill>
                                <TabPill active={tab === "kanji"} onClick={() => updateParams({ tab: "kanji", page: 0 })}>
                                    <span className="font-black text-sm leading-none">漢</span>
                                    Kanji
                                </TabPill>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                                <LevelChip label="Tất cả" active={level === ""} onClick={() => updateParams({ level: "", page: 0 })} />
                                {JLPT_LEVELS.map((lv) => (
                                    <LevelChip
                                        key={lv}
                                        label={lv}
                                        active={level === lv}
                                        colorClass={JLPT[lv].badge}
                                        onClick={() => updateParams({ level: lv, page: 0 })}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* ── Result count ── */}
                        <p className="text-xs text-muted-foreground">
                            {loading ? (
                                <span className="flex items-center gap-1.5">
                                    <Loader2 className="h-3 w-3 animate-spin" />Đang tải…
                                </span>
                            ) : (
                                <>
                                    <span className="font-semibold text-foreground">{totalItems}</span>{" "}
                                    {tab === "kanji" ? "kanji" : "từ vựng"}
                                    {level && <> ở level <span className="font-semibold text-foreground">{level}</span></>}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <Card className="border-destructive/40 bg-destructive/5 py-3 px-4">
                        <div className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    </Card>
                )}

                {/* ── Loading skeleton ── */}
                {loading && <BrowseSkeleton mode={tab} />}

                {/* ── Word list ── */}
                {!loading && tab === "vocabulary" && words && words.items.length > 0 && (
                    <Card className="gap-0 py-0 overflow-hidden">
                        <div className="divide-y">
                            {words.items.map((w) => (
                                <BrowseWordRow key={w.id} word={w} onClick={() => goWord(w.word)} />
                            ))}
                        </div>
                    </Card>
                )}

                {/* ── Kanji grid ── */}
                {!loading && tab === "kanji" && kanjis && kanjis.items.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {kanjis.items.map((k) => (
                            <BrowseKanjiCard key={k.character} kanji={k} onClick={() => goKanji(k.character)} />
                        ))}
                    </div>
                )}

                {/* ── Empty ── */}
                {isEmpty && (
                    <EmptyState
                        className="py-10"
                        icon={<Layers className="size-7" />}
                        title={tab === "kanji" ? "Chưa có kanji nào" : "Chưa có từ vựng nào"}
                        description={
                            level
                                ? `Không có ${tab === "kanji" ? "kanji" : "từ vựng"} nào ở level ${level}. Thử chọn level khác.`
                                : "Dữ liệu từ điển chưa được nhập."
                        }
                    />
                )}

                {/* ── Pagination ── */}
                {!loading && !error && totalPages > 1 && (
                    <div className="flex items-center justify-center gap-3 pb-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={page <= 0}
                            onClick={() => updateParams({ page: page - 1 })}
                            className="gap-1"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Trước
                        </Button>
                        <span className="text-sm text-muted-foreground tabular-nums">
                            Trang <span className="font-semibold text-foreground">{page + 1}</span> / {totalPages}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={page >= totalPages - 1}
                            onClick={() => updateParams({ page: page + 1 })}
                            className="gap-1"
                        >
                            Sau
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Tab pill
// ══════════════════════════════════════════════════════════════════════
function TabPill({ active, onClick, children }: {
    active: boolean; onClick: () => void; children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
            }`}
        >
            {children}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Level filter chip
// ══════════════════════════════════════════════════════════════════════
function LevelChip({ label, active, colorClass, onClick }: {
    label: string; active: boolean; colorClass?: string; onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`rounded-full border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                active
                    ? colorClass ?? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
            } ${active && colorClass ? "ring-1 ring-current" : ""}`}
        >
            {label}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Word row
// ══════════════════════════════════════════════════════════════════════
function BrowseWordRow({ word, onClick }: { word: WordSearchResult; onClick: () => void }) {
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;
    return (
        <button
            onClick={onClick}
            className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-accent/50 transition-colors text-left group"
        >
            <div className="flex flex-col items-start shrink-0 min-w-[4.5rem] sm:min-w-[6rem]">
                <span className="text-xl font-bold leading-none whitespace-nowrap text-foreground group-hover:text-primary transition-colors">
                    {word.word}
                </span>
                {word.reading && word.reading !== word.word && (
                    <span className="text-[11px] text-muted-foreground leading-tight mt-1 whitespace-nowrap">
                        {word.reading}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                {word.meaningText && (
                    <p className="text-sm text-foreground leading-tight line-clamp-1">{word.meaningText}</p>
                )}
                <div className="flex items-center gap-1 flex-wrap">
                    {jlpt && (
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 ${jlpt.badge}`}>
                            {word.levelCode}
                        </Badge>
                    )}
                    {rep && (
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 ${rep.className}`}>
                            {rep.label}
                        </Badge>
                    )}
                    {typeLabel && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
                            {typeLabel}
                        </Badge>
                    )}
                    {word.frequency != null && (
                        <span className="text-[9px] flex items-center gap-0.5 text-yellow-600 dark:text-yellow-500 font-medium">
                            <Star className="h-2.5 w-2.5 fill-current" />#{word.frequency}
                        </span>
                    )}
                </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Kanji card
// ══════════════════════════════════════════════════════════════════════
function BrowseKanjiCard({ kanji, onClick }: { kanji: DictionaryKanjiDetail; onClick: () => void }) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    const firstReading = (s?: string) => s?.split(/[・、,,\s]+/).find(Boolean);
    const onyomi  = firstReading(kanji.onyomi);
    const kunyomi = firstReading(kanji.kunyomi);
    return (
        <button
            onClick={onClick}
            className="relative flex flex-col items-center text-center gap-1 rounded-xl border bg-card px-2 pt-6 pb-3 min-h-[8.5rem] transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 group"
        >
            {jlpt && (
                <Badge variant="outline" className={`absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0 h-4 ${jlpt.badge}`}>
                    {kanji.jlptLevel}
                </Badge>
            )}
            {kanji.stroke != null && (
                <span className="absolute top-2 right-2 text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <Pen className="h-2.5 w-2.5" />{kanji.stroke}
                </span>
            )}
            <span className="text-4xl sm:text-5xl font-bold leading-none text-foreground group-hover:text-primary transition-colors">
                {kanji.character}
            </span>
            {kanji.meaning && (
                <span className="text-xs text-muted-foreground leading-snug line-clamp-2 mt-1">{kanji.meaning}</span>
            )}
            {(onyomi || kunyomi) && (
                <span className="flex items-center gap-1 mt-auto pt-1">
                    {onyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap">
                            音 {onyomi}
                        </span>
                    )}
                    {kunyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                            訓 {kunyomi}
                        </span>
                    )}
                </span>
            )}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Skeleton
// ══════════════════════════════════════════════════════════════════════
function BrowseSkeleton({ mode }: { mode: BrowseTab }) {
    if (mode === "kanji") {
        return (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 animate-pulse">
                {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="rounded-xl border bg-card min-h-[8.5rem] flex flex-col items-center justify-center gap-2 p-3">
                        <div className="h-12 w-12 bg-muted rounded-lg" />
                        <div className="h-3 w-16 bg-muted/60 rounded" />
                    </div>
                ))}
            </div>
        );
    }
    return (
        <Card className="gap-0 py-0 overflow-hidden animate-pulse">
            <div className="divide-y">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                        <div className="h-6 w-16 bg-muted rounded" />
                        <div className="flex-1 space-y-1.5">
                            <div className="h-3.5 w-2/3 bg-muted/60 rounded" />
                            <div className="h-3 w-24 bg-muted/40 rounded" />
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}