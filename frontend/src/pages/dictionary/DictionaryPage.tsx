import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
    Search, Clock, Copy, Check, Book, BookOpen, ChevronDown, ChevronRight,
    Pen, Loader2, Volume2, Bookmark, X, Star, GitBranch,
    Sparkles, AlertCircle, Languages, Layers, BookMarked, StickyNote,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SakuraDashboardSidePanel } from "@/components/sakura-dashboard/SakuraStudyDashboard";
import { useDashboardData } from "@/pages/management/dashboard/useDashboardData";
import { EmptyState } from "@/components/common/EmptyState";
import { FuriganaText } from "@/components/common/FuriganaText";
import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type {
    WordSearchResult, WordSuggestion, DictionaryKanjiInfo,
    DictionaryExampleInfo, DictionaryKanjiDetail, FeaturedResult,
    TatoebaExample,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { HandwritingInput } from "./HandwritingInput";
import { VoiceInput } from "./VoiceInput";
import { ConjugationTable } from "./ConjugationTable";
import { NotebookPicker } from "./NotebookPicker";
import { InteractiveSentence } from "./InteractiveSentence";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";
import { KanjiBreakdown } from "./KanjiBreakdown";
import { JLPT, JLPT_LEVELS, REP_LABELS, WORD_TYPE_LABELS } from "./dictionaryConstants";
import {
    loadSavedWords, loadSavedKanjis, markWordSaved, markKanjiSaved,
    fetchNotebook,
} from "./savedStorage";

// ── Constants ─────────────────────────────────────────────────────────
const HISTORY_KEY = "dict_search_history";
const MAX_HISTORY = 10;
const FURIGANA_KEY = "dict_furigana";

// ── Storage helpers ───────────────────────────────────────────────────
function loadHistory(): string[] {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); }
    catch { return []; }
}
function pushHistory(term: string) {
    const h = loadHistory().filter((x) => x !== term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify([term, ...h].slice(0, MAX_HISTORY)));
}
function dropHistory(term: string) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(loadHistory().filter((x) => x !== term)));
}
function loadFuriganaPref(): boolean {
    try { return localStorage.getItem(FURIGANA_KEY) !== "0"; } // mặc định bật
    catch { return true; }
}

function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return dv;
}

type SearchMode = "vocabulary" | "kanji";

// ══════════════════════════════════════════════════════════════════════
// Page
// ══════════════════════════════════════════════════════════════════════
export default function DictionaryPage() {
    // Same side-panel data (Record / Thành tích / Thống kê) as the dashboard —
    // this page reuses the dashboard `pageScroll` shell + `sidePanel`.
    const dashboardData = useDashboardData();

    const [searchMode, setSearchMode]     = useState<SearchMode>("vocabulary");
    const [query, setQuery]               = useState("");
    const [results, setResults]           = useState<WordSearchResult[] | null>(null);
    const [kanjiResults, setKanjiResults] = useState<DictionaryKanjiDetail[] | null>(null);
    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState<string | null>(null);
    const [searched, setSearched]         = useState("");

    const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
    const [history, setHistory]         = useState<string[]>([]);
    const [dropMode, setDropMode]       = useState<"history" | "suggestions">("history");
    const [showDrop, setShowDrop]       = useState(false);
    const [activeIdx, setActiveIdx]     = useState(-1);

    const [featured, setFeatured] = useState<FeaturedResult | null>(null);
    const [furigana, setFurigana] = useState<boolean>(loadFuriganaPref);
    const [hubStats, setHubStats] = useState<{ words: number; kanjis: number } | null>(null);

    const [savedWords,  setSavedWords]  = useState<WordSearchResult[]>(loadSavedWords);
    const [savedKanjis, setSavedKanjis] = useState<DictionaryKanjiDetail[]>(loadSavedKanjis);

    const [searchParams, setSearchParams] = useSearchParams();

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef  = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(query, 250);

    useEffect(() => {
        dictionaryApi.featured(9).then(setFeatured).catch(() => {});
        // Tổng số từ/kanji cho card "Kho từ vựng tổng hợp" (size=1 — chỉ cần totalItems).
        Promise.all([
            dictionaryApi.browseWords(undefined, 0, 1),
            dictionaryApi.browseKanjis(undefined, 0, 1),
        ]).then(([w, k]) => setHubStats({ words: w.totalItems, kanjis: k.totalItems }))
          .catch(() => {});
        // Đồng bộ sổ tay từ server để icon bookmark đúng trạng thái đa thiết bị.
        // Lỗi mạng → giữ cache localStorage (đã là initial state).
        fetchNotebook()
            .then(({ words, kanjis }) => { setSavedWords(words); setSavedKanjis(kanjis); })
            .catch(() => {});
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
                setShowDrop(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    useEffect(() => {
        if (!debouncedQ.trim()) { setSuggestions([]); return; }
        dictionaryApi.suggest(debouncedQ)
            .then((d) => { setSuggestions(d); setDropMode("suggestions"); setShowDrop(d.length > 0); setActiveIdx(-1); })
            .catch(() => { setSuggestions([]); setShowDrop(false); });
    }, [debouncedQ]);

    const handleSearch = useCallback(async (q?: string, mode?: SearchMode) => {
        const term = (q ?? query).trim();
        const effectiveMode = mode ?? searchMode;
        if (!term) return;
        setShowDrop(false);
        setLoading(true);
        setError(null);
        setResults(null);
        setKanjiResults(null);
        setSearched(term);
        pushHistory(term);
        setHistory(loadHistory());
        try {
            if (effectiveMode === "kanji") {
                setKanjiResults(await dictionaryApi.kanjiSearch(term));
            } else {
                setResults(await dictionaryApi.search(term));
            }
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Tìm kiếm thất bại.");
        } finally {
            setLoading(false);
        }
    }, [query, searchMode]);

    const switchMode = useCallback((newMode: SearchMode) => {
        if (newMode === searchMode) return;
        setSearchMode(newMode);
        const term = searched || query.trim();
        if (term) {
            handleSearch(term, newMode);
        } else {
            setResults(null);
            setKanjiResults(null);
            setError(null);
        }
    }, [searchMode, query, searched, handleSearch]);

    // Khi điều hướng từ trang Sổ tay sang (?q=...&mode=...): tự điền & tra ngay.
    // Sau khi tra xong xóa param khỏi URL (replace) để không tra lại khi người
    // dùng tìm từ khác — lần chạy kế tiếp q=null nên thoát sớm, không vòng lặp.
    useEffect(() => {
        const q = searchParams.get("q");
        if (!q) return;
        const mode: SearchMode = searchParams.get("mode") === "kanji" ? "kanji" : "vocabulary";
        setSearchMode(mode);
        setQuery(q);
        handleSearch(q, mode);
        setSearchParams({}, { replace: true });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const selectSuggestion = (s: WordSuggestion) => { setQuery(s.word); handleSearch(s.word); };

    const onFocus = () => {
        if (!query.trim()) {
            const h = loadHistory();
            setHistory(h);
            setDropMode("history");
            setShowDrop(h.length > 0);
        }
    };

    const dropItems = dropMode === "history" ? history : suggestions;

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (!showDrop) { if (e.key === "Enter") handleSearch(); return; }
        if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, dropItems.length - 1)); }
        else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
        else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIdx >= 0) {
                if (dropMode === "suggestions") selectSuggestion(suggestions[activeIdx]);
                else { setQuery(history[activeIdx]); handleSearch(history[activeIdx]); }
            } else handleSearch();
        } else if (e.key === "Escape") { setShowDrop(false); setActiveIdx(-1); }
    };

    const quickSearch = (w: string) => { setQuery(w); handleSearch(w); };
    const quickVocabSearch = (w: string) => {
        setSearchMode("vocabulary");
        setQuery(w);
        handleSearch(w, "vocabulary");
    };

    const toggleFurigana = () => setFurigana((v) => {
        try { localStorage.setItem(FURIGANA_KEY, v ? "0" : "1"); } catch { /* ignore */ }
        return !v;
    });

    const clearAllHistory = () => { localStorage.removeItem(HISTORY_KEY); setHistory([]); setShowDrop(false); };
    const removeHistoryItem = (term: string) => {
        dropHistory(term);
        const updated = loadHistory();
        setHistory(updated);
        if (!updated.length) setShowDrop(false);
    };

    const savedWordIds    = useMemo(() => new Set(savedWords.map((w) => w.id)),         [savedWords]);
    const savedKanjiChars = useMemo(() => new Set(savedKanjis.map((k) => k.character)), [savedKanjis]);

    const handleWordSavedChange  = (word: WordSearchResult, saved: boolean)    => setSavedWords(markWordSaved(word, saved));
    const handleKanjiSavedChange = (kanji: DictionaryKanjiDetail, saved: boolean) => setSavedKanjis(markKanjiSaved(kanji, saved));

    const hasVocabResults = !loading && results !== null;
    const hasKanjiResults = !loading && kanjiResults !== null;
    const noResults = (hasVocabResults && results!.length === 0) || (hasKanjiResults && kanjiResults!.length === 0);
    const totalSaved = savedWords.length + savedKanjis.length;

    return (
        <MainLayout
            pathName={{ "/dictionary": "Từ điển Nhật-Việt" }}
            pageScroll
            sidePanel={<SakuraDashboardSidePanel {...dashboardData} />}
        >
            <div className="w-full space-y-4">

                {/* ── Dictionary panel: search hero + Kho từ vựng + Sổ tay — nội dung phẳng, không khung bọc ───── */}
                <div>

                    {/* ── Search hero ── */}
                    <div className="space-y-4">

                            {/* Title */}
                            <div className="flex flex-wrap items-center gap-3.5 min-w-0">
                                <span className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                                    <Book className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <h1 className="text-lg sm:text-[22px] font-extrabold leading-tight text-foreground">
                                        Từ điển Nhật - Việt
                                    </h1>
                                    <p className="hidden sm:block text-[13.5px] text-muted-foreground mt-0.5">
                                        Tra từ vựng, kanji, kana, romaji hoặc tiếng Việt
                                    </p>
                                </div>
                                <div className="flex gap-2.5 shrink-0">
                                    <Button asChild variant="outline" size="sm"
                                        className="gap-1.5 rounded-full border-primary/15 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:border-primary/30 transition"
                                        title="Duyệt toàn bộ từ vựng & kanji theo cấp độ JLPT">
                                        <Link to="/vocabulary">
                                            <Layers className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Kho từ vựng</span>
                                        </Link>
                                    </Button>
                                    <Button asChild variant="outline" size="sm"
                                        className="gap-1.5 rounded-full border-primary/15 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:border-primary/30 transition">
                                        <Link to="/notebook">
                                            <Bookmark className="h-3.5 w-3.5" />
                                            <span className="hidden sm:inline">Sổ tay</span>
                                            {totalSaved > 0 && (
                                                <Badge variant="secondary" className="ml-0.5 px-1.5 h-4 text-[10px]">
                                                    {totalSaved}
                                                </Badge>
                                            )}
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            {/* ── Search bar ── */}
                            <div ref={wrapRef} className="relative">
                                <div className="flex items-center gap-2.5 rounded-2xl border border-primary/10 bg-gradient-to-b from-primary/[0.06] to-primary/[0.1] px-3.5 py-2 shadow-[inset_0_1px_3px_rgba(0,0,0,0.03)]">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-1 top-1/2 -translate-y-1/2 h-[17px] w-[17px] text-muted-foreground pointer-events-none" />
                                        <Input
                                            ref={inputRef}
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            onKeyDown={onKeyDown}
                                            onFocus={onFocus}
                                            placeholder={
                                                searchMode === "kanji"
                                                    ? "成人・seijin・học sinh..."
                                                    : "食べる・taberu・ăn・eat..."
                                            }
                                            className="h-10 pl-7 pr-2 text-[15px] rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent"
                                            autoFocus
                                            autoComplete="off"
                                        />
                                    </div>
                                    <HandwritingInput onSelect={(char) => {
                                        // Append the picked kanji to the existing query so users
                                        // can compose multi-kanji words (e.g. 成 → 成人).
                                        const next = query + char;
                                        setQuery(next);
                                        handleSearch(next);
                                    }} />
                                    <VoiceInput onSelect={(text) => { setQuery(text); handleSearch(text); }} />
                                    <Button
                                        onClick={() => handleSearch()}
                                        disabled={loading || !query.trim()}
                                        size="icon"
                                        className="h-9 w-9 rounded-full shrink-0"
                                        title="Tìm"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <span className="text-[12px] font-bold">Tìm</span>
                                        )}
                                    </Button>
                                </div>

                                {/* Dropdown */}
                                {showDrop && dropItems.length > 0 && (
                                    <Card className="absolute left-0 right-0 top-full mt-2 z-50 py-0 overflow-hidden shadow-lg">
                                        {dropMode === "history" ? (
                                            <>
                                                <div className="flex items-center justify-between px-4 py-2 border-b">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                                                        <Clock className="h-3.5 w-3.5" />
                                                        Gần đây
                                                    </span>
                                                    <button
                                                        onMouseDown={(e) => { e.preventDefault(); clearAllHistory(); }}
                                                        className="text-xs text-primary hover:text-primary/80 font-medium"
                                                    >Xóa tất cả</button>
                                                </div>
                                                <ScrollHintContainer axis="vertical" scrollStep={120} className="max-h-[200px]">
                                                    {history.map((term, i) => (
                                                        <HistoryRow key={term} term={term} active={i === activeIdx}
                                                            onSelect={() => { setQuery(term); handleSearch(term); }}
                                                            onRemove={() => removeHistoryItem(term)}
                                                            onHover={() => setActiveIdx(i)} />
                                                    ))}
                                                </ScrollHintContainer>
                                            </>
                                        ) : (
                                            suggestions.map((s, i) => (
                                                <SuggestionItem key={s.id} suggestion={s} active={i === activeIdx}
                                                    onSelect={() => selectSuggestion(s)} onHover={() => setActiveIdx(i)} />
                                            ))
                                        )}
                                    </Card>
                                )}
                            </div>

                            {/* ── Mode pills + furigana toggle + result count ── */}
                            <div className="relative flex items-center justify-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={toggleFurigana}
                                    title={furigana ? "Tắt furigana" : "Hiện furigana (cách đọc trên kanji)"}
                                    className={`sm:absolute sm:left-0 flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                        furigana
                                            ? "bg-primary/10 border-primary/30 text-primary"
                                            : "bg-muted/40 text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <ruby className="text-sm font-bold leading-none">
                                        漢<rt className="text-[7px] font-medium">かん</rt>
                                    </ruby>
                                    <span className="hidden sm:inline">Furigana</span>
                                </button>
                                <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => switchMode("vocabulary")}
                                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                                            searchMode === "vocabulary"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <BookOpen className="h-3.5 w-3.5" />
                                        Từ vựng
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => switchMode("kanji")}
                                        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                                            searchMode === "kanji"
                                                ? "bg-background text-foreground shadow-sm"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <span className="font-black text-sm leading-none">漢</span>
                                        Kanji
                                    </button>
                                </div>

                                {searched && (
                                    <span className="text-xs text-muted-foreground sm:absolute sm:right-0">
                                        {loading ? (
                                            <span className="flex items-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" />Đang tìm…
                                            </span>
                                        ) : noResults ? (
                                            <>Không tìm thấy <span className="font-semibold text-foreground">「{searched}」</span></>
                                        ) : (
                                            <>
                                                <span className="font-semibold text-foreground">
                                                    {results?.length ?? kanjiResults?.length ?? 0}
                                                </span>{" "}
                                                {searchMode === "kanji" ? "kanji" : "kết quả"} cho{" "}
                                                <span className="font-semibold text-foreground">「{searched}」</span>
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                    </div>

                    {/* ── Kho từ vựng tổng hợp (entry point sang /vocabulary) ── */}
                    {!loading && (
                        <>
                            <div className="h-px bg-border my-6" />
                            <VocabularyHubCard stats={hubStats} />
                        </>
                    )}

                    {/* ── Sổ tay (entry point sang /notebook, kèm preview mục mới lưu) ── */}
                    {!loading && (
                        <>
                            <div className="h-px bg-border my-6" />
                            <NotebookHubCard
                                words={savedWords}
                                kanjis={savedKanjis}
                                furigana={furigana}
                                onWordClick={quickVocabSearch}
                                onKanjiClick={(ch) => {
                                    setSearchMode("kanji");
                                    setQuery(ch);
                                    handleSearch(ch, "kanji");
                                }}
                            />
                        </>
                    )}
                </div>

                {/* ── Error ── */}
                {error && (
                    <Card className="border-destructive/40 bg-destructive/5">
                        <CardContent className="py-3 text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </CardContent>
                    </Card>
                )}

                {/* ── Loading skeleton ── */}
                {loading && <ResultsSkeleton mode={searchMode} />}

                {/* ── Vocabulary results ── */}
                {hasVocabResults && results!.length > 0 && (
                    <div className="space-y-3">
                        {results!.map((w) => (
                            <WordCard key={w.id} word={w} onSearch={quickSearch} furigana={furigana} linkToDetail
                                savedIds={savedWordIds} onSavedChange={handleWordSavedChange} />
                        ))}
                    </div>
                )}

                {/* ── Kanji results ── */}
                {hasKanjiResults && kanjiResults!.length > 0 && (
                    <div className="space-y-3">
                        {kanjiResults!.map((k) => (
                            <KanjiDetailCard key={k.character} kanji={k} onVocabSearch={quickVocabSearch}
                                furigana={furigana}
                                savedChars={savedKanjiChars} onSavedChange={handleKanjiSavedChange} />
                        ))}
                    </div>
                )}

                {/* ── Featured ── */}
                {!loading && featured && (
                    <FeaturedSection
                        featured={featured}
                        furigana={furigana}
                        onWordClick={quickSearch}
                        onKanjiClick={(ch) => {
                            setSearchMode("kanji");
                            setQuery(ch);
                            handleSearch(ch, "kanji");
                        }}
                    />
                )}

                {/* ── No results ── */}
                {!loading && noResults && (
                    <EmptyState
                        className="py-10"
                        icon={<Search className="size-7" />}
                        title="Không tìm thấy kết quả"
                        description={
                            searchMode === "kanji"
                                ? "Thử nhập từ vựng, kanji, kana hoặc romaji"
                                : "Thử nhập kanji, kana, romaji hoặc nghĩa tiếng Việt"
                        }
                    />
                )}
            </div>
        </MainLayout>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Skeleton
// ══════════════════════════════════════════════════════════════════════
function ResultsSkeleton({ mode }: { mode: SearchMode }) {
    return (
        <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => (
                <Card key={i} className="overflow-hidden gap-0 py-0">
                    <div className="h-1 bg-muted" />
                    <div className="p-5 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-10 bg-muted rounded-full" />
                            <div className="h-4 w-14 bg-muted rounded-full" />
                        </div>
                        {mode === "kanji" ? (
                            <div className="flex gap-4">
                                <div className="h-20 w-20 bg-muted rounded-xl shrink-0" />
                                <div className="flex-1 space-y-2 pt-1">
                                    <div className="h-5 w-28 bg-muted rounded" />
                                    <div className="h-4 w-44 bg-muted/60 rounded" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="h-10 w-32 bg-muted rounded-lg" />
                                <div className="h-9 bg-muted/60 rounded-lg" />
                            </>
                        )}
                    </div>
                </Card>
            ))}
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// History row
// ══════════════════════════════════════════════════════════════════════
function HistoryRow({ term, active, onSelect, onRemove, onHover }: {
    term: string; active: boolean;
    onSelect: () => void; onRemove: () => void; onHover: () => void;
}) {
    return (
        <div onMouseEnter={onHover}
            className={`flex items-center gap-3 px-4 py-2.5 group transition-colors ${active ? "bg-accent" : "hover:bg-accent/50"}`}>
            <div onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 text-sm text-foreground truncate">{term}</span>
            </div>
            <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
                className="opacity-0 group-hover:opacity-100 shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            ><X className="h-3 w-3" /></button>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Suggestion item
// ══════════════════════════════════════════════════════════════════════
function SuggestionItem({ suggestion, active, onSelect, onHover }: {
    suggestion: WordSuggestion; active: boolean; onSelect: () => void; onHover: () => void;
}) {
    const jlpt = JLPT[suggestion.levelCode ?? ""];
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
            onMouseEnter={onHover}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-accent" : "hover:bg-accent/50"}`}
        >
            <span className="text-base font-semibold text-foreground w-20 shrink-0 truncate">{suggestion.word}</span>
            {suggestion.reading && suggestion.reading !== suggestion.word && (
                <span className="text-sm text-muted-foreground w-20 shrink-0 truncate">【{suggestion.reading}】</span>
            )}
            <span className="text-sm text-muted-foreground flex-1 truncate">{suggestion.meaningText}</span>
            {jlpt && (
                <Badge variant="outline" className={`text-[10px] font-bold shrink-0 ${jlpt.badge}`}>
                    {suggestion.levelCode}
                </Badge>
            )}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Word card
// ══════════════════════════════════════════════════════════════════════
export function WordCard({ word, onSearch, furigana, savedIds, onSavedChange, linkToDetail }: {
    word: WordSearchResult;
    onSearch: (w: string) => void;
    furigana: boolean;
    savedIds: Set<number>;
    /** Báo item còn được lưu ở ≥1 sổ tay hay không (sau khi chọn sổ tay trong picker). */
    onSavedChange: (word: WordSearchResult, saved: boolean) => void;
    /** Hiện nút mở trang chi tiết /words/:id (dùng ở danh sách kết quả; bỏ khi đã ở trang chi tiết). */
    linkToDetail?: boolean;
}) {
    const [showEx, setShowEx] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showTatoeba, setShowTatoeba]       = useState(false);
    const [tatoeba, setTatoeba]               = useState<TatoebaExample[] | null>(null);
    const [tatoebaLoading, setTatoebaLoading] = useState(false);
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    const copy = () => {
        navigator.clipboard.writeText(word.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    const toggleTatoeba = async () => {
        const next = !showTatoeba;
        setShowTatoeba(next);
        if (next && tatoeba === null && !tatoebaLoading) {
            setTatoebaLoading(true);
            try { setTatoeba(await dictionaryApi.examples(word.word)); }
            catch { setTatoeba([]); }
            finally { setTatoebaLoading(false); }
        }
    };

    return (
        <Card className="overflow-hidden gap-0 py-0 transition-shadow hover:shadow-md">

            {/* Header */}
            <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-2">
                            {furigana && word.reading && word.reading !== word.word ? (
                                <FuriganaText
                                    word={word.word}
                                    reading={word.reading}
                                    className="text-3xl font-bold text-foreground tracking-tight"
                                    rubyClassName={`text-xs font-medium ${jlpt ? jlpt.text : "text-muted-foreground"}`}
                                />
                            ) : (
                                <>
                                    <span className="text-3xl font-bold text-foreground leading-none tracking-tight">
                                        {word.word}
                                    </span>
                                    {word.reading && word.reading !== word.word && (
                                        <span className={`text-base font-medium leading-none ${jlpt ? jlpt.text : "text-muted-foreground"}`}>
                                            【{word.reading}】
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {jlpt && (
                                <Badge variant="outline" className={`text-[10px] font-bold ${jlpt.badge}`}>
                                    {word.levelCode}
                                </Badge>
                            )}
                            {rep && (
                                <Badge variant="outline" className={`text-[10px] font-bold ${rep.className}`}>
                                    {rep.label}
                                </Badge>
                            )}
                            {typeLabel && (
                                <Badge variant="secondary" className="text-[10px]">
                                    {typeLabel}
                                </Badge>
                            )}
                            {word.frequency && (
                                <span className="text-[10px] flex items-center gap-0.5 text-yellow-600 dark:text-yellow-500 font-medium">
                                    <Star className="h-3 w-3 fill-current" />#{word.frequency}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                        <SpeakButton text={word.reading || word.word} lookupWord={word.word} />
                        <NotebookPicker
                            target={{ kind: "word", wordId: word.id }}
                            savedAnywhere={savedIds.has(word.id)}
                            onSavedChange={(saved) => onSavedChange(word, saved)} />
                        {linkToDetail && (
                            <Button asChild size="icon-sm" variant="ghost" title="Xem chi tiết">
                                <Link to={`/words/${word.id}`}><BookOpen className="h-3.5 w-3.5" /></Link>
                            </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={copy} className="h-8 px-2 text-xs">
                            {copied
                                ? <><Check className="h-3 w-3 text-green-600 dark:text-green-400" />Đã sao chép</>
                                : <><Copy className="h-3 w-3" />Sao chép</>}
                        </Button>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Meaning(s) */}
            <div className="px-5 py-3">
                {word.meanings && word.meanings.length > 0 ? (
                    <div className="space-y-1.5">
                        {word.meanings.map((m, i) => (
                            <div key={i} className="flex items-start gap-2">
                                <MeaningLangBadge code={m.languageCode} name={m.languageName} />
                                <p className="text-sm font-medium text-foreground leading-snug flex-1">{m.name}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm font-medium text-foreground leading-snug">{word.meaningText}</p>
                )}
            </div>

            {/* Kanji breakdown */}
            {word.kanjis.length > 0 && (
                <>
                    <Separator />
                    <div className="px-5 py-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            Hán tự trong từ
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                            {word.kanjis.map((k) => (
                                <KanjiChip key={k.character} kanji={k} onClick={() => onSearch(k.character ?? "")} />
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Bảng chia động từ / tính từ (FE-only, suy từ wordType — tự ẩn nếu không chia được) */}
            <ConjugationTable word={word.word} reading={word.reading} wordType={word.wordType} furigana={furigana} />

            {/* Examples accordion */}
            {word.examples.length > 0 && (
                <>
                    <Separator />
                    <button
                        onClick={() => setShowEx((v) => !v)}
                        className="w-full px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <Book className="h-3 w-3" />
                            Ví dụ câu ({word.examples.length})
                        </span>
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showEx ? "rotate-180" : ""}`} />
                    </button>
                    {showEx && (
                        <>
                            <Separator />
                            <div className="divide-y bg-muted/30">
                                {word.examples.map((ex, i) => (
                                    <ExampleRow key={i} example={ex} index={i + 1} furigana={furigana} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Tatoeba — ví dụ thực tế (lazy-load) */}
            <Separator />
            <button
                onClick={toggleTatoeba}
                className="w-full px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <Languages className="h-3 w-3" />
                    Ví dụ thực tế
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">Tatoeba</Badge>
                    {tatoeba && tatoeba.length > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground/70">({tatoeba.length})</span>
                    )}
                </span>
                {tatoebaLoading
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showTatoeba ? "rotate-180" : ""}`} />}
            </button>
            {showTatoeba && (
                <>
                    <Separator />
                    <div className="divide-y bg-muted/30">
                        {tatoebaLoading ? (
                            <div className="px-5 py-4 flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Đang tải ví dụ từ Tatoeba...
                            </div>
                        ) : tatoeba && tatoeba.length > 0 ? (
                            tatoeba.map((ex, i) => <TatoebaRow key={ex.sentenceId ?? i} example={ex} furigana={furigana} />)
                        ) : (
                            <div className="px-5 py-4 text-xs text-muted-foreground text-center">
                                Không tìm thấy ví dụ thực tế cho từ này.
                            </div>
                        )}
                    </div>
                </>
            )}
        </Card>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Kanji detail card
// ══════════════════════════════════════════════════════════════════════
function KanjiDetailCard({ kanji, onVocabSearch, furigana, savedChars, onSavedChange }: {
    kanji: DictionaryKanjiDetail;
    onVocabSearch: (w: string) => void;
    furigana: boolean;
    savedChars: Set<string>;
    onSavedChange: (kanji: DictionaryKanjiDetail, saved: boolean) => void;
}) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    const splitReadings = (s: string | undefined) =>
        s ? s.split(/[・、,,\s]+/).map((r) => r.trim()).filter(Boolean) : [];
    const onyomiList  = splitReadings(kanji.onyomi);
    const kunyomiList = splitReadings(kanji.kunyomi);
    const [showStrokeOrder, setShowStrokeOrder] = useState(false);
    const [showBreakdown,   setShowBreakdown]   = useState(false);

    return (
        <Card className="overflow-hidden gap-0 py-0 transition-shadow hover:shadow-md">

            {/* Hero */}
            <div className="relative px-6 py-5 overflow-hidden">
                <span
                    className="absolute -right-2 top-1/2 -translate-y-1/2 text-[7rem] font-black leading-none select-none pointer-events-none text-foreground/[0.04]"
                    aria-hidden
                >{kanji.character}</span>

                <div className="relative flex items-center gap-5">
                    <div className="shrink-0 flex flex-col items-center gap-1.5">
                        <span className={`text-7xl font-bold leading-none tracking-tight ${jlpt ? jlpt.text : "text-foreground"}`}>
                            {kanji.character}
                        </span>
                        <div className="flex gap-1">
                            <SpeakButton text={kanji.character} lookupWord={kanji.character} />
                            <NotebookPicker
                                target={{ kind: "kanji", character: kanji.character }}
                                savedAnywhere={savedChars.has(kanji.character)}
                                onSavedChange={(saved) => onSavedChange(kanji, saved)} />
                        </div>
                    </div>

                    <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-wrap gap-1.5">
                            {jlpt && (
                                <Badge variant="outline" className={`text-[11px] font-bold ${jlpt.badge}`}>
                                    JLPT {kanji.jlptLevel}
                                </Badge>
                            )}
                            {kanji.stroke != null && (
                                <Badge variant="secondary" className="text-[11px] gap-1">
                                    <Pen className="h-3 w-3" />
                                    {kanji.stroke} nét
                                </Badge>
                            )}
                            {kanji.radical && (
                                <Badge variant="outline" className="text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                    Bộ {kanji.radical}
                                </Badge>
                            )}
                        </div>
                        {kanji.meaning && (
                            <p className="text-lg font-semibold text-foreground leading-snug">
                                {kanji.meaning}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Readings */}
            {(onyomiList.length > 0 || kunyomiList.length > 0) && (
                <>
                    <Separator />
                    <div className="px-5 py-4 space-y-3">
                        {onyomiList.length > 0 && (
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30 shrink-0 text-[10px] font-bold">
                                    音読み
                                </Badge>
                                <div className="flex flex-wrap gap-1.5">
                                    {onyomiList.map((r) => (
                                        <span key={r} className="text-base font-semibold px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {kunyomiList.length > 0 && (
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 shrink-0 text-[10px] font-bold">
                                    訓読み
                                </Badge>
                                <div className="flex flex-wrap gap-1.5">
                                    {kunyomiList.map((r) => (
                                        <span key={r} className="text-base font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
                                            {r}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Related words */}
            {kanji.words.length > 0 && (
                <>
                    <Separator />
                    <div className="px-5 pt-3.5 pb-1 flex items-center justify-between">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Book className="h-3 w-3" />
                            Từ vựng liên quan
                        </p>
                        {kanji.words.length > 6 && (
                            <span className="text-[10px] text-muted-foreground/70">{kanji.words.length} từ</span>
                        )}
                    </div>
                    <div className="divide-y">
                        {kanji.words.slice(0, 6).map((w) => (
                            <button
                                key={w.word}
                                onClick={() => onVocabSearch(w.word)}
                                className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/50 transition-colors text-left group"
                            >
                                {furigana && w.reading && w.reading !== w.word ? (
                                    <FuriganaText
                                        word={w.word}
                                        reading={w.reading}
                                        className="text-lg font-bold text-foreground min-w-14 shrink-0 group-hover:text-primary transition-colors"
                                    />
                                ) : (
                                    <span className="text-lg font-bold text-foreground w-14 shrink-0 group-hover:text-primary transition-colors">
                                        {w.word}
                                    </span>
                                )}
                                <div className="flex-1 min-w-0">
                                    {!furigana && w.reading && w.reading !== w.word && (
                                        <span className="text-xs text-muted-foreground block leading-tight">
                                            {w.reading}
                                        </span>
                                    )}
                                    {w.meaningText && (
                                        <span className="text-sm text-foreground leading-tight line-clamp-1">
                                            {w.meaningText}
                                        </span>
                                    )}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Stroke order */}
            <Separator />
            <button
                onClick={() => setShowStrokeOrder((v) => !v)}
                className="w-full px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <Pen className="h-3 w-3" />
                    Thứ tự nét viết
                    {kanji.stroke != null && (
                        <span className="text-[10px] font-medium text-muted-foreground/70">({kanji.stroke} nét)</span>
                    )}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showStrokeOrder ? "rotate-180" : ""}`} />
            </button>
            {showStrokeOrder && (
                <>
                    <Separator />
                    <div className="px-4 bg-muted/30">
                        <KanjiStrokeOrder character={kanji.character} />
                    </div>
                </>
            )}

            {/* Breakdown */}
            <Separator />
            <button
                onClick={() => setShowBreakdown((v) => !v)}
                className="w-full px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <GitBranch className="h-3 w-3" />
                    Sơ đồ cấu thành
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showBreakdown ? "rotate-180" : ""}`} />
            </button>
            {showBreakdown && (
                <>
                    <Separator />
                    <div className="px-4 py-4 bg-muted/30">
                        <KanjiBreakdown character={kanji.character} />
                    </div>
                </>
            )}
        </Card>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Kanji chip (small — inside word card)
// ══════════════════════════════════════════════════════════════════════
function KanjiChip({ kanji, onClick }: { kanji: DictionaryKanjiInfo; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-stretch rounded-lg border bg-card hover:border-primary/40 hover:shadow-sm transition-all text-left group overflow-hidden"
        >
            <div className="w-10 flex items-center justify-center bg-muted/50 group-hover:bg-primary/10 transition-colors border-r shrink-0">
                <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors leading-none py-2">
                    {kanji.character}
                </span>
            </div>
            <div className="px-2.5 py-1.5 min-w-0 flex flex-col justify-center gap-0.5">
                {kanji.meaning && (
                    <p className="text-[11px] font-semibold text-foreground leading-tight line-clamp-1 max-w-[6rem]">
                        {kanji.meaning}
                    </p>
                )}
                <div className="flex flex-wrap gap-1">
                    {kanji.onyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap">
                            音 {kanji.onyomi.split(/[・、]/)[0]}
                        </span>
                    )}
                    {kanji.kunyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                            訓 {kanji.kunyomi.split(/[・、]/)[0]}
                        </span>
                    )}
                    {kanji.stroke != null && (
                        <span className="text-[9px] text-muted-foreground self-center">{kanji.stroke}nét</span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Example row
// ══════════════════════════════════════════════════════════════════════
function ExampleRow({ example, index, furigana }: { example: DictionaryExampleInfo; index: number; furigana: boolean }) {
    return (
        <div className="flex gap-3 px-5 py-3">
            <span className="text-[10px] font-bold text-muted-foreground/60 shrink-0 w-4 pt-0.5 tabular-nums">
                {index}.
            </span>
            <div className="min-w-0">
                <InteractiveSentence
                    text={example.rootExample ?? ""}
                    furigana={furigana}
                    className="font-medium text-foreground text-sm leading-snug" />
                <p className="text-sm text-primary mt-0.5 leading-snug">{example.toExample}</p>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Tatoeba example row
// ══════════════════════════════════════════════════════════════════════
const TATOEBA_LANG: Record<string, { label: string; className: string }> = {
    vie: { label: "VI", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
    eng: { label: "EN", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
};

// Badge mã ngôn ngữ cho từng nghĩa (vi, en, ja...)
const MEANING_LANG: Record<string, { label: string; className: string }> = {
    vi:  { label: "VI", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
    vie: { label: "VI", className: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30" },
    en:  { label: "EN", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
    eng: { label: "EN", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30" },
    ja:  { label: "JA", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
    jpn: { label: "JA", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
};

function MeaningLangBadge({ code, name }: { code?: string; name?: string }) {
    const key = code?.toLowerCase() ?? "";
    const meta = MEANING_LANG[key];
    const label = meta?.label ?? (code ? code.toUpperCase() : (name ?? "?"));
    const className = meta?.className ?? "bg-muted text-muted-foreground border-border";
    return (
        <Badge variant="outline" className={`text-[9px] font-bold px-1 py-0 h-4 shrink-0 mt-0.5 ${className}`}>
            {label}
        </Badge>
    );
}

function TatoebaRow({ example, furigana }: { example: TatoebaExample; furigana: boolean }) {
    const lang = TATOEBA_LANG[example.translationLang];
    return (
        <div className="flex gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-2">
                    <InteractiveSentence
                        text={example.japanese}
                        furigana={furigana}
                        className="font-medium text-foreground text-sm leading-snug flex-1" />
                    <div className="shrink-0 -mt-1 -mr-1">
                        <SpeakButton text={example.japanese} />
                    </div>
                </div>
                <div className="flex items-start gap-1.5 mt-0.5">
                    {lang && (
                        <Badge variant="outline" className={`text-[9px] font-bold px-1 py-0 h-4 shrink-0 mt-0.5 ${lang.className}`}>
                            {lang.label}
                        </Badge>
                    )}
                    <p className="text-sm text-primary leading-snug">{example.translation}</p>
                </div>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Vocabulary hub card — entry point sang trang "Kho từ vựng tổng hợp"
// (/vocabulary). Nút nhỏ trên header không đủ để người dùng hiểu trang đó
// chứa gì, nên card này nói rõ: tổng số từ/kanji thật + duyệt theo cấp độ.
// ══════════════════════════════════════════════════════════════════════
function VocabularyHubCard({ stats }: { stats: { words: number; kanjis: number } | null }) {
    const fmt = (n: number) => n.toLocaleString("vi-VN");
    return (
        <>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-3.5">
                    <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                        <Layers className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="sm:hidden h-4 w-4 text-primary" />
                            Kho từ vựng tổng hợp
                        </p>
                        <p className="text-[13.5px] text-muted-foreground leading-relaxed mt-1">
                            {stats ? (
                                <>
                                    Duyệt toàn bộ{" "}
                                    <span className="font-semibold text-foreground">{fmt(stats.words)} từ vựng</span> và{" "}
                                    <span className="font-semibold text-foreground">{fmt(stats.kanjis)} kanji</span>{" "}
                                    của từ điển — xem nghĩa, cách đọc và lọc theo cấp độ JLPT
                                </>
                            ) : (
                                <>Duyệt toàn bộ từ vựng và kanji của từ điển — xem nghĩa, cách đọc và lọc theo cấp độ JLPT</>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2.5 shrink-0">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:border-primary/30 transition">
                            <Link to="/vocabulary?tab=vocabulary">
                                <BookOpen className="h-3.5 w-3.5" />
                                Duyệt từ vựng
                            </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:border-primary/30 transition">
                            <Link to="/vocabulary?tab=kanji">
                                <span className="font-black text-xs leading-none">漢</span>
                                Duyệt kanji
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Chip cấp độ — đi thẳng tới danh sách đã lọc theo level */}
                <div className="relative mt-3.5 flex items-center gap-2 flex-wrap sm:pl-[3.375rem]">
                    <span className="text-[11.5px] font-bold text-muted-foreground tracking-wide">
                        HỌC THEO CẤP ĐỘ
                    </span>
                    {JLPT_LEVELS.map((lv) => (
                        <Link
                            key={lv}
                            to={`/vocabulary?level=${lv}`}
                            title={`Toàn bộ từ vựng cấp độ ${lv}`}
                            className={`px-3 py-1 rounded-full border text-xs font-bold shadow-sm transition-all hover:shadow-md hover:-translate-y-px ${JLPT[lv].badge}`}
                        >
                            {lv}
                        </Link>
                    ))}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                </div>
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Notebook hub card — entry point sang trang "Sổ tay" (/notebook).
// Nút nhỏ trên header quá kín đáo; card này show số liệu thật + preview
// các mục mới lưu gần nhất (click tra lại ngay), và hướng dẫn cách lưu
// khi sổ tay còn trống.
// ══════════════════════════════════════════════════════════════════════
const NOTEBOOK_PREVIEW_WORDS  = 4;
const NOTEBOOK_PREVIEW_KANJIS = 6;

function NotebookHubCard({ words, kanjis, furigana, onWordClick, onKanjiClick }: {
    words: WordSearchResult[];
    kanjis: DictionaryKanjiDetail[];
    furigana: boolean;
    onWordClick: (w: string) => void;
    onKanjiClick: (ch: string) => void;
}) {
    const total = words.length + kanjis.length;
    const previewWords  = words.slice(0, NOTEBOOK_PREVIEW_WORDS);
    const previewKanjis = kanjis.slice(0, NOTEBOOK_PREVIEW_KANJIS);
    const moreCount = total - previewWords.length - previewKanjis.length;

    return (
        <>
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-3.5">
                    <span className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
                        <BookMarked className="h-[17px] w-[17px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                        <p className="text-[17px] font-bold text-foreground flex items-center gap-1.5">
                            <BookMarked className="sm:hidden h-4 w-4 text-primary" />
                            Sổ tay của tôi
                            {total > 0 && (
                                <Badge variant="secondary" className="px-1.5 h-4 text-[10px]">{total}</Badge>
                            )}
                        </p>
                        <p className="text-[13.5px] text-muted-foreground leading-relaxed mt-1">
                            {total > 0 ? (
                                <>
                                    Đã lưu{" "}
                                    {words.length > 0 && (
                                        <span className="font-semibold text-foreground">{words.length} từ vựng</span>
                                    )}
                                    {words.length > 0 && kanjis.length > 0 && " và "}
                                    {kanjis.length > 0 && (
                                        <span className="font-semibold text-foreground">{kanjis.length} kanji</span>
                                    )}{" "}
                                    — đồng bộ theo tài khoản, kèm ghi chú cá nhân để ôn tập
                                </>
                            ) : (
                                <>Lưu từ vựng & kanji hay gặp để ôn tập — đồng bộ theo tài khoản trên mọi thiết bị</>
                            )}
                        </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <Button asChild size="sm" variant="outline" className="gap-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_5px_14px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:border-primary/30 transition">
                            <Link to="/notebook">
                                <BookMarked className="h-3.5 w-3.5" />
                                Mở sổ tay
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Preview các mục mới lưu / empty hint */}
                {total > 0 ? (
                    <div className="relative mt-3 flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mr-0.5">
                            Mới lưu
                        </span>
                        {previewWords.map((w) => (
                            <button
                                key={`w-${w.id}`}
                                type="button"
                                onClick={() => onWordClick(w.word)}
                                title={w.meaningText ?? w.word}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-card text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:text-primary hover:shadow-sm hover:-translate-y-px"
                            >
                                {furigana && w.reading && w.reading !== w.word ? (
                                    <FuriganaText word={w.word} reading={w.reading}
                                        rubyClassName="text-[8px] text-muted-foreground" />
                                ) : (
                                    <span>{w.word}</span>
                                )}
                                {w.levelCode && JLPT[w.levelCode] && (
                                    <span className={`text-[9px] font-bold ${JLPT[w.levelCode].text}`}>
                                        {w.levelCode}
                                    </span>
                                )}
                            </button>
                        ))}
                        {previewKanjis.map((k) => (
                            <button
                                key={`k-${k.character}`}
                                type="button"
                                onClick={() => onKanjiClick(k.character)}
                                title={k.meaning ?? k.character}
                                className="flex items-center justify-center w-8 h-8 rounded-md border bg-card text-base font-bold text-foreground transition-all hover:border-primary/40 hover:text-primary hover:shadow-sm hover:-translate-y-px"
                            >
                                {k.character}
                            </button>
                        ))}
                        {moreCount > 0 && (
                            <Link
                                to="/notebook"
                                className="px-2 py-1 rounded-md border border-dashed text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground hover:border-primary/40"
                            >
                                +{moreCount} mục
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="relative mt-3 flex items-center gap-2 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5">
                        <StickyNote className="h-4 w-4 text-primary/70 shrink-0" />
                        <p className="text-xs text-muted-foreground leading-snug">
                            Sổ tay còn trống — tra một từ rồi nhấn{" "}
                            <Bookmark className="inline h-3 w-3 mx-0.5 align-[-2px]" />
                            trên kết quả để lưu vào đây
                        </p>
                    </div>
                )}
        </>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Featured section
// ══════════════════════════════════════════════════════════════════════
function FeaturedSection({ featured, furigana, onWordClick, onKanjiClick }: {
    featured: FeaturedResult;
    furigana: boolean;
    onWordClick: (w: string) => void;
    onKanjiClick: (ch: string) => void;
}) {
    return (
        <div className="space-y-3">
            {featured.words.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Từ vựng phổ biến
                        </p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-x divide-y">
                        {featured.words.map((w) => (
                            <FeaturedWordChip key={w.id} word={w} furigana={furigana} onClick={onWordClick} />
                        ))}
                    </div>
                </Card>
            )}

            {featured.kanjis.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <span className="text-base font-black text-purple-500 leading-none">漢</span>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Kanji cơ bản
                        </p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 divide-x divide-y">
                        {featured.kanjis.map((k) => (
                            <FeaturedKanjiChip key={k.character} kanji={k} onClick={onKanjiClick} />
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

function FeaturedWordChip({ word, furigana, onClick }: {
    word: WordSearchResult; furigana: boolean; onClick: (w: string) => void;
}) {
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    return (
        <button
            onClick={() => onClick(word.word)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
        >
            <div className="flex flex-col items-center shrink-0 min-w-[3rem]">
                {furigana && word.reading && word.reading !== word.word ? (
                    <FuriganaText
                        word={word.word}
                        reading={word.reading}
                        className="text-xl font-bold whitespace-nowrap text-foreground group-hover:text-primary transition-colors"
                    />
                ) : (
                    <>
                        <span className="text-xl font-bold leading-none whitespace-nowrap text-foreground group-hover:text-primary transition-colors">
                            {word.word}
                        </span>
                        {word.reading && word.reading !== word.word && (
                            <span className="text-[9px] text-muted-foreground leading-tight mt-1 whitespace-nowrap">
                                {word.reading}
                            </span>
                        )}
                    </>
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs text-foreground leading-tight line-clamp-1">{word.meaningText}</p>
                <div className="flex items-center gap-1">
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
                </div>
            </div>
        </button>
    );
}

function FeaturedKanjiChip({ kanji, onClick }: { kanji: DictionaryKanjiDetail; onClick: (ch: string) => void }) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    // Chỉ lấy cách đọc đầu tiên cho gọn — chi tiết đầy đủ xem ở thẻ kanji khi click.
    const firstReading = (s?: string) => (s ? s.split(/[・、,,\s]+/)[0]?.trim() : undefined);
    const on  = firstReading(kanji.onyomi);
    const kun = firstReading(kanji.kunyomi);
    return (
        <button
            onClick={() => onClick(kanji.character)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
        >
            <span className="text-4xl font-bold leading-none shrink-0 text-foreground group-hover:text-primary transition-colors">
                {kanji.character}
            </span>
            <div className="flex-1 min-w-0 space-y-1">
                {kanji.meaning && (
                    <p className="text-xs font-semibold text-foreground leading-tight line-clamp-1">
                        {kanji.meaning}
                    </p>
                )}
                <div className="flex flex-wrap gap-1">
                    {on && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-600 dark:text-orange-400 font-semibold whitespace-nowrap">
                            音 {on}
                        </span>
                    )}
                    {kun && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold whitespace-nowrap">
                            訓 {kun}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    {jlpt && (
                        <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 ${jlpt.badge}`}>
                            {kanji.jlptLevel}
                        </Badge>
                    )}
                    {kanji.stroke != null && (
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{kanji.stroke} nét</span>
                    )}
                    {kanji.radical && (
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">bộ {kanji.radical}</span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Speak button — thử audio người thật (Forvo) trước, fallback Web Speech (TTS)
// ══════════════════════════════════════════════════════════════════════
function pickJapaneseVoice(): SpeechSynthesisVoice | null {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return voices.find((v) => v.lang === "ja-JP")
        ?? voices.find((v) => v.lang.toLowerCase().startsWith("ja"))
        ?? null;
}

function SpeakButton({ text, lookupWord }: { text: string; lookupWord?: string }) {
    const [speaking, setSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Cache kết quả tra Forvo theo từ: undefined = chưa tra, null = đã tra & không có.
    const forvoCache = useRef<{ word?: string; url?: string | null }>({});

    const stop = () => {
        window.speechSynthesis?.cancel();
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        setSpeaking(false);
    };

    const playTts = () => {
        if (!window.speechSynthesis) { setSpeaking(false); return; }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "ja-JP";
        utt.rate = 0.85;
        const voice = pickJapaneseVoice();
        if (voice) utt.voice = voice;
        utt.onstart = () => setSpeaking(true);
        utt.onend   = () => setSpeaking(false);
        utt.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utt);
    };

    const playAudio = (url: string) => {
        const audio = new Audio(url);
        audioRef.current = audio;
        audio.onended = () => setSpeaking(false);
        audio.onerror = () => { audioRef.current = null; playTts(); };
        setSpeaking(true);
        audio.play().catch(() => { audioRef.current = null; playTts(); });
    };

    const speak = async () => {
        if (speaking) { stop(); return; }

        if (lookupWord) {
            let url = forvoCache.current.word === lookupWord ? forvoCache.current.url : undefined;
            if (url === undefined) {
                setSpeaking(true); // phản hồi tức thì trong lúc chờ mạng
                try { url = (await dictionaryApi.audio(lookupWord))?.url ?? null; }
                catch { url = null; }
                forvoCache.current = { word: lookupWord, url };
            }
            if (url) { playAudio(url); return; }
        }
        playTts();
    };

    return (
        <Button
            onClick={speak}
            size="icon-sm"
            variant="ghost"
            title="Nghe phát âm"
            className={speaking ? "text-primary" : ""}
        >
            <Volume2 className={`h-3.5 w-3.5 ${speaking ? "animate-pulse" : ""}`} />
        </Button>
    );
}
