import { useState, useRef, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult, WordSuggestion, DictionaryKanjiInfo, DictionaryExampleInfo, DictionaryKanjiDetail, FeaturedResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandwritingInput } from "./HandwritingInput";
import { VoiceInput } from "./VoiceInput";

// ── Constants ─────────────────────────────────────────────────────────
const WORD_TYPE_LABELS: Record<string, string> = {
    n: "Danh từ", v1: "Động từ nhóm 2",
    v5: "Động từ nhóm 1", v5k: "Động từ nhóm 1", v5g: "Động từ nhóm 1",
    v5s: "Động từ nhóm 1", v5t: "Động từ nhóm 1", v5n: "Động từ nhóm 1",
    v5b: "Động từ nhóm 1", v5m: "Động từ nhóm 1", v5r: "Động từ nhóm 1",
    "adj-i": "Tính từ -い", "adj-na": "Tính từ -な",
    adv: "Phó từ", expr: "Thành ngữ", pref: "Tiền tố",
    suf: "Hậu tố", conj: "Liên từ", int: "Thán từ",
};

const JLPT: Record<string, { badge: string; bar: string; accent: string; soft: string; softDark: string; text: string }> = {
    N1: {
        badge:    "bg-red-100 text-red-700 border-red-300",
        bar:      "bg-gradient-to-r from-red-500 to-rose-500",
        accent:   "border-l-red-400",
        soft:     "bg-red-50",
        softDark: "dark:bg-red-950/20",
        text:     "text-red-600 dark:text-red-400",
    },
    N2: {
        badge:    "bg-orange-100 text-orange-700 border-orange-300",
        bar:      "bg-gradient-to-r from-orange-500 to-amber-400",
        accent:   "border-l-orange-400",
        soft:     "bg-orange-50",
        softDark: "dark:bg-orange-950/20",
        text:     "text-orange-600 dark:text-orange-400",
    },
    N3: {
        badge:    "bg-yellow-100 text-yellow-700 border-yellow-300",
        bar:      "bg-gradient-to-r from-yellow-400 to-orange-400",
        accent:   "border-l-yellow-400",
        soft:     "bg-yellow-50",
        softDark: "dark:bg-yellow-950/20",
        text:     "text-yellow-600 dark:text-yellow-500",
    },
    N4: {
        badge:    "bg-green-100 text-green-700 border-green-300",
        bar:      "bg-gradient-to-r from-green-500 to-emerald-400",
        accent:   "border-l-green-400",
        soft:     "bg-green-50",
        softDark: "dark:bg-green-950/20",
        text:     "text-green-600 dark:text-green-400",
    },
    N5: {
        badge:    "bg-blue-100 text-blue-700 border-blue-300",
        bar:      "bg-gradient-to-r from-blue-500 to-indigo-500",
        accent:   "border-l-blue-400",
        soft:     "bg-blue-50",
        softDark: "dark:bg-blue-950/20",
        text:     "text-blue-600 dark:text-blue-400",
    },
};

const REP_LABELS: Record<string, { label: string; style: string }> = {
    KANJI:    { label: "漢字", style: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300" },
    HIRAGANA: { label: "ひら", style: "bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300" },
    KATAKANA: { label: "カナ", style: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300" },
    MIXED:    { label: "混合", style: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300" },
};

const QUICK_EXAMPLES = ["食べる", "水", "学校", "taberu", "mizu", "ăn", "nước"];
const HISTORY_KEY = "dict_search_history";
const MAX_HISTORY = 10;

// ── History helpers ───────────────────────────────────────────────────
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

// ── Debounce hook ─────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [dv, setDv] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDv(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return dv;
}

type SearchMode = "vocabulary" | "kanji";

// ── Page ──────────────────────────────────────────────────────────────
export default function DictionaryPage() {
    const [searchMode, setSearchMode] = useState<SearchMode>("vocabulary");
    const [query, setQuery]           = useState("");
    const [results, setResults]       = useState<WordSearchResult[] | null>(null);
    const [kanjiResults, setKanjiResults] = useState<DictionaryKanjiDetail[] | null>(null);
    const [loading, setLoading]       = useState(false);
    const [error, setError]           = useState<string | null>(null);
    const [searched, setSearched]     = useState("");

    const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
    const [history, setHistory]         = useState<string[]>([]);
    const [dropMode, setDropMode]       = useState<"history" | "suggestions">("history");
    const [showDrop, setShowDrop]       = useState(false);
    const [activeIdx, setActiveIdx]     = useState(-1);

    const [featured, setFeatured]       = useState<FeaturedResult | null>(null);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef  = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(query, 250);

    // Load featured on mount
    useEffect(() => {
        dictionaryApi.featured().then(setFeatured).catch(() => {});
    }, []);

    // Clear results when switching mode
    useEffect(() => {
        setResults(null);
        setKanjiResults(null);
        setError(null);
        setSearched("");
    }, [searchMode]);

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

    // From kanji card related words → switch to vocabulary mode
    const quickVocabSearch = (w: string) => {
        setSearchMode("vocabulary");
        setQuery(w);
        handleSearch(w, "vocabulary");
    };

    const clearAllHistory = () => { localStorage.removeItem(HISTORY_KEY); setHistory([]); setShowDrop(false); };
    const removeHistoryItem = (term: string) => {
        dropHistory(term);
        const updated = loadHistory();
        setHistory(updated);
        if (!updated.length) setShowDrop(false);
    };

    const hasVocabResults = !loading && results !== null;
    const hasKanjiResults = !loading && kanjiResults !== null;
    const noResults = (hasVocabResults && results!.length === 0) || (hasKanjiResults && kanjiResults!.length === 0);

    return (
        <MainLayout pathName={{ "/dictionary": "Từ điển Nhật-Việt" }}>
            <div className="max-w-3xl mx-auto w-full space-y-3">

                {/* ── Hero ── */}
                <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-950 dark:via-indigo-950 dark:to-violet-950 shadow-xl">
                    {/* Decorative background */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none select-none" aria-hidden>
                        <span className="absolute -top-3 -right-1 text-white/[0.07] text-[8rem] font-black leading-none">辞</span>
                        <span className="absolute -bottom-4 -left-1 text-white/[0.05] text-[6rem] font-black leading-none">語</span>
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.02] text-[12rem] font-black leading-none">本</span>
                        <div className="absolute inset-0 opacity-[0.035]"
                            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }} />
                    </div>

                    <div className="relative z-10 px-5 pt-4 pb-4">
                        {/* ── Title row ── */}
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h1 className="text-xl font-black text-white tracking-tight leading-tight">日本語辞書</h1>
                                <p className="text-blue-200/70 text-xs mt-0.5">Từ điển Nhật – Việt toàn diện</p>
                            </div>
                            <div className="flex gap-1 flex-wrap justify-end max-w-[160px]">
                                {["JLPT N1–N5", "Kanji・Kana", "Việt & Anh"].map((f) => (
                                    <span key={f} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/60 font-medium whitespace-nowrap">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* ── Search bar ── */}
                        <div ref={wrapRef} className="relative mb-3">
                            <div className="flex gap-1.5">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
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
                                        className="text-sm pl-9 pr-3 bg-white dark:bg-gray-900 border-0 h-9 rounded-lg shadow-inner"
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <HandwritingInput onSelect={(char) => { setQuery(char); handleSearch(char); }} />
                                <VoiceInput onSelect={(text) => { setQuery(text); handleSearch(text); }} />
                                <Button
                                    onClick={() => handleSearch()}
                                    disabled={loading || !query.trim()}
                                    className="h-9 px-4 bg-white text-blue-700 hover:bg-blue-50 font-bold border-0 shadow-none rounded-lg shrink-0 text-sm"
                                >
                                    {loading ? <Spinner /> : "Tìm"}
                                </Button>
                            </div>

                            {/* Dropdown */}
                            {showDrop && dropItems.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                                    {dropMode === "history" ? (
                                        <>
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                                                    <ClockIcon className="h-3.5 w-3.5" />
                                                    Gần đây
                                                </span>
                                                <button
                                                    onMouseDown={(e) => { e.preventDefault(); clearAllHistory(); }}
                                                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                                                >Xóa tất cả</button>
                                            </div>
                                            {history.map((term, i) => (
                                                <HistoryRow key={term} term={term} active={i === activeIdx}
                                                    onSelect={() => { setQuery(term); handleSearch(term); }}
                                                    onRemove={() => removeHistoryItem(term)}
                                                    onHover={() => setActiveIdx(i)} />
                                            ))}
                                        </>
                                    ) : (
                                        suggestions.map((s, i) => (
                                            <SuggestionItem key={s.id} suggestion={s} active={i === activeIdx}
                                                onSelect={() => selectSuggestion(s)} onHover={() => setActiveIdx(i)} />
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        {/* ── Mode toggle — centered below search bar ── */}
                        <div className="flex justify-center mb-1">
                            <div className="flex gap-0.5 bg-white/10 rounded-lg p-0.5">
                                <button
                                    onClick={() => setSearchMode("vocabulary")}
                                    className={`flex items-center gap-1 px-5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                                        searchMode === "vocabulary"
                                            ? "bg-white text-blue-700 shadow-sm"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    <BookOpenIcon className="h-3 w-3 shrink-0" />
                                    Từ vựng
                                </button>
                                <button
                                    onClick={() => setSearchMode("kanji")}
                                    className={`flex items-center gap-1 px-5 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                                        searchMode === "kanji"
                                            ? "bg-white text-blue-700 shadow-sm"
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    <span className="font-black leading-none">漢</span>
                                    Kanji
                                </button>
                            </div>
                        </div>

                        {/* ── Result count (after search) ── */}
                        {searched && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 h-px bg-white/10" />
                                <span className="text-[11px] text-white/60 whitespace-nowrap">
                                    {loading ? (
                                        <span className="flex items-center gap-1.5"><Spinner />Đang tìm...</span>
                                    ) : noResults ? (
                                        <span className="text-white/50">Không tìm thấy <span className="font-bold text-white/70">「{searched}」</span></span>
                                    ) : (
                                        <>
                                            <span className="font-bold text-white/90">
                                                {results?.length ?? kanjiResults?.length ?? 0}
                                            </span>{" "}
                                            {searchMode === "kanji" ? "kanji" : "kết quả"} cho{" "}
                                            <span className="font-bold text-white">「{searched}」</span>
                                        </>
                                    )}
                                </span>
                                <div className="flex-1 h-px bg-white/10" />
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="text-base">⚠</span>
                        {error}
                    </div>
                )}

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                                <div className="h-1 bg-gray-200 dark:bg-gray-700" />
                                <div className="p-4 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-4 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                        <div className="h-4 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    </div>
                                    {searchMode === "kanji" ? (
                                        <div className="flex gap-4">
                                            <div className="h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
                                            <div className="flex-1 space-y-2 pt-1">
                                                <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
                                                <div className="h-4 w-44 bg-gray-100 dark:bg-gray-800 rounded" />
                                                <div className="h-4 w-36 bg-gray-100 dark:bg-gray-800 rounded" />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                            <div className="h-9 bg-blue-50 dark:bg-blue-950/20 rounded-xl" />
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Vocabulary results ── */}
                {hasVocabResults && results!.length > 0 && (
                    <div className="space-y-3">
                        {results!.map((w) => <WordCard key={w.id} word={w} onSearch={quickSearch} />)}
                    </div>
                )}

                {/* ── Kanji results ── */}
                {hasKanjiResults && kanjiResults!.length > 0 && (
                    <div className="space-y-3">
                        {kanjiResults!.map((k) => (
                            <KanjiDetailCard key={k.character} kanji={k} onVocabSearch={quickVocabSearch} />
                        ))}
                    </div>
                )}

                {/* ── Featured (shown only before any search) ── */}
                {!searched && !loading && featured && (
                    <div className="space-y-3">
                        {featured.words.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                                <div className="px-4 pt-3.5 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                    <span className="text-sm font-black text-yellow-500">★</span>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        Từ vựng phổ biến
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-px bg-gray-100 dark:bg-gray-800">
                                    {featured.words.map((w) => (
                                        <FeaturedWordChip key={w.id} word={w} onClick={quickSearch} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {featured.kanjis.length > 0 && (
                            <div className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                                <div className="px-4 pt-3.5 pb-2 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
                                    <span className="text-sm font-black text-purple-500">漢</span>
                                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                                        Kanji cơ bản
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2 p-3">
                                    {featured.kanjis.map((k) => (
                                        <FeaturedKanjiChip
                                            key={k.character}
                                            kanji={k}
                                            onClick={(ch) => {
                                                setSearchMode("kanji");
                                                setQuery(ch);
                                                handleSearch(ch, "kanji");
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── No results ── */}
                {!loading && noResults && (
                    <div className="flex flex-col items-center py-10 bg-white dark:bg-gray-900 rounded-2xl border gap-2">
                        <span className="text-4xl">🔍</span>
                        <p className="font-bold text-gray-700 dark:text-gray-300">Không tìm thấy kết quả</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-xs">
                            {searchMode === "kanji"
                                ? "Thử nhập từ vựng, kanji, kana hoặc romaji"
                                : "Thử nhập kanji, kana, romaji hoặc nghĩa tiếng Việt"}
                        </p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

// ── History row ───────────────────────────────────────────────────────
function HistoryRow({ term, active, onSelect, onRemove, onHover }: {
    term: string; active: boolean;
    onSelect: () => void; onRemove: () => void; onHover: () => void;
}) {
    return (
        <div onMouseEnter={onHover}
            className={`flex items-center gap-3 px-4 py-2.5 group transition-colors ${active ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
            <div onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                <ClockIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">{term}</span>
            </div>
            <button
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }}
                className="opacity-0 group-hover:opacity-100 shrink-0 h-5 w-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-200 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-all text-base leading-none"
            >×</button>
        </div>
    );
}

// ── Suggestion item ───────────────────────────────────────────────────
function SuggestionItem({ suggestion, active, onSelect, onHover }: {
    suggestion: WordSuggestion; active: boolean; onSelect: () => void; onHover: () => void;
}) {
    const jlpt = JLPT[suggestion.levelCode ?? ""];
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
            onMouseEnter={onHover}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        >
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 w-20 shrink-0 truncate">{suggestion.word}</span>
            {suggestion.reading && suggestion.reading !== suggestion.word && (
                <span className="text-sm text-gray-400 dark:text-gray-500 w-20 shrink-0 truncate">【{suggestion.reading}】</span>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{suggestion.meaningText}</span>
            {jlpt && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${jlpt.badge}`}>
                    {suggestion.levelCode}
                </span>
            )}
        </button>
    );
}

// ── Word card ─────────────────────────────────────────────────────────
function WordCard({ word, onSearch }: { word: WordSearchResult; onSearch: (w: string) => void }) {
    const [showEx, setShowEx] = useState(false);
    const [copied, setCopied] = useState(false);
    const jlpt     = JLPT[word.levelCode ?? ""];
    const rep      = REP_LABELS[word.representationCode ?? ""];
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    const copy = () => {
        navigator.clipboard.writeText(word.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-l-4 shadow-sm overflow-hidden transition-shadow hover:shadow-md ${jlpt ? jlpt.accent : "border-l-gray-300"}`}>

            {jlpt && <div className={`h-1 ${jlpt.bar}`} />}

            {/* ── Header ── */}
            <div className={`px-4 pt-3 pb-3 ${jlpt ? `${jlpt.soft} ${jlpt.softDark}` : ""}`}>
                <div className="flex items-start justify-between gap-2">
                    {/* Left: word + reading + badges */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
                            <span className="text-4xl font-black text-gray-900 dark:text-gray-50 leading-none tracking-tight">
                                {word.word}
                            </span>
                            {word.reading && word.reading !== word.word && (
                                <span className={`text-base font-medium leading-none ${jlpt ? jlpt.text : "text-gray-400"}`}>
                                    【{word.reading}】
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {jlpt && (
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border tracking-wide ${jlpt.badge}`}>
                                    {word.levelCode}
                                </span>
                            )}
                            {rep && (
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rep.style}`}>
                                    {rep.label}
                                </span>
                            )}
                            {typeLabel && (
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                    {typeLabel}
                                </span>
                            )}
                            {word.frequency && (
                                <span className="text-[10px] flex items-center gap-0.5 text-yellow-600 dark:text-yellow-500 font-medium">
                                    <span>★</span>#{word.frequency}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Copy button */}
                    <button
                        onClick={copy}
                        className={`flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-all font-medium shrink-0 ${
                            copied
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                : "text-gray-400 hover:text-gray-600 hover:bg-white/80 dark:hover:bg-gray-800 bg-white/50 dark:bg-gray-800/40"
                        }`}
                    >
                        {copied ? <CheckIcon className="h-3 w-3" /> : <CopyIcon className="h-3 w-3" />}
                        {copied ? "Đã copy" : "Copy"}
                    </button>
                </div>
            </div>

            {/* ── Meaning ── */}
            <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800">
                <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl ${jlpt ? `${jlpt.soft} ${jlpt.softDark}` : "bg-gray-50 dark:bg-gray-800/60"}`}>
                    <div className={`w-0.5 rounded-full self-stretch shrink-0 ${jlpt ? jlpt.bar : "bg-gray-300"}`} />
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                        {word.meaningText}
                    </p>
                </div>
            </div>

            {/* ── Kanji breakdown ── */}
            {word.kanjis.length > 0 && (
                <div className="px-4 pt-2.5 pb-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <span>漢</span>Hán tự trong từ
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {word.kanjis.map((k) => (
                            <KanjiCard key={k.character} kanji={k} onClick={() => onSearch(k.character ?? "")} />
                        ))}
                    </div>
                </div>
            )}

            {/* ── Examples accordion ── */}
            {word.examples.length > 0 && (
                <>
                    <button
                        onClick={() => setShowEx((v) => !v)}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-1.5">
                            <BookIcon className="h-3 w-3" />
                            Ví dụ câu ({word.examples.length})
                        </span>
                        <ChevronIcon className={`h-3.5 w-3.5 transition-transform duration-200 ${showEx ? "rotate-180" : ""}`} />
                    </button>
                    {showEx && (
                        <div className="divide-y divide-gray-100 dark:divide-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                            {word.examples.map((ex, i) => (
                                <ExampleRow key={i} example={ex} index={i + 1} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Kanji detail card ─────────────────────────────────────────────────
function KanjiDetailCard({ kanji, onVocabSearch }: {
    kanji: DictionaryKanjiDetail;
    onVocabSearch: (w: string) => void;
}) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;

    const splitReadings = (s: string | undefined) =>
        s ? s.split(/[・、,，\s]+/).map((r) => r.trim()).filter(Boolean) : [];

    const onyomiList  = splitReadings(kanji.onyomi);
    const kunyomiList = splitReadings(kanji.kunyomi);

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-l-4 overflow-hidden shadow-sm transition-shadow hover:shadow-lg ${jlpt ? jlpt.accent : "border-l-gray-300 dark:border-l-gray-600"}`}>
            {/* Gradient top bar */}
            {jlpt && <div className={`h-1.5 ${jlpt.bar}`} />}

            {/* ── Hero: big kanji + meaning ── */}
            <div className={`relative px-6 pt-5 pb-5 overflow-hidden ${jlpt ? `${jlpt.soft} ${jlpt.softDark}` : "bg-gray-50 dark:bg-gray-800/40"}`}>
                {/* Ghost character background */}
                <span
                    className="absolute -right-3 top-1/2 -translate-y-1/2 text-[8rem] font-black leading-none select-none pointer-events-none"
                    style={{ opacity: 0.055 }}
                    aria-hidden
                >
                    {kanji.character}
                </span>

                <div className="relative flex items-center gap-5">
                    {/* Giant kanji */}
                    <div className="shrink-0 flex flex-col items-center">
                        <span className={`text-[5.5rem] font-black leading-none tracking-tighter ${jlpt ? jlpt.text : "text-gray-700 dark:text-gray-200"}`}>
                            {kanji.character}
                        </span>
                    </div>

                    {/* Meta */}
                    <div className="flex-1 min-w-0 space-y-2">
                        {/* Badges row */}
                        <div className="flex flex-wrap gap-1.5">
                            {jlpt && (
                                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border tracking-wide ${jlpt.badge}`}>
                                    JLPT {kanji.jlptLevel}
                                </span>
                            )}
                            {kanji.stroke != null && (
                                <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full bg-white/70 dark:bg-gray-700/60 text-gray-600 dark:text-gray-300 font-medium border border-gray-200/70 dark:border-gray-600/50">
                                    <PenIcon className="h-2.5 w-2.5" />
                                    {kanji.stroke} nét
                                </span>
                            )}
                            {kanji.radical && (
                                <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-bold border border-amber-200/60 dark:border-amber-900/40">
                                    Bộ {kanji.radical}
                                </span>
                            )}
                        </div>

                        {/* Meaning */}
                        {kanji.meaning && (
                            <p className="text-xl font-black text-gray-800 dark:text-gray-100 leading-snug">
                                {kanji.meaning}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Readings ── */}
            {(onyomiList.length > 0 || kunyomiList.length > 0) && (
                <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
                    {onyomiList.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black px-2 py-1 rounded-md bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 shrink-0 leading-none">
                                音読み
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {onyomiList.map((r) => (
                                    <span
                                        key={r}
                                        className="text-sm font-bold px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300 border border-orange-100 dark:border-orange-900/30 tracking-wide"
                                    >
                                        {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {kunyomiList.length > 0 && (
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 shrink-0 leading-none">
                                訓読み
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {kunyomiList.map((r) => (
                                    <span
                                        key={r}
                                        className="text-sm font-bold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 tracking-wide"
                                    >
                                        {r}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Related words ── */}
            {kanji.words.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                    <div className="px-5 pt-3.5 pb-1 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                            <BookIcon className="h-3 w-3" />
                            Từ vựng liên quan
                        </p>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600 font-medium">
                            {kanji.words.length > 6 ? `${kanji.words.length} từ` : ""}
                        </span>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-gray-800/70 pb-1">
                        {kanji.words.slice(0, 6).map((w) => (
                            <button
                                key={w.word}
                                onClick={() => onVocabSearch(w.word)}
                                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-colors text-left group"
                            >
                                <span className="text-xl font-black text-gray-900 dark:text-gray-100 w-14 shrink-0 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {w.word}
                                </span>
                                <div className="flex-1 min-w-0">
                                    {w.reading && w.reading !== w.word && (
                                        <span className="text-xs text-gray-400 dark:text-gray-500 block leading-tight mb-0.5">
                                            {w.reading}
                                        </span>
                                    )}
                                    {w.meaningText && (
                                        <span className="text-sm text-gray-600 dark:text-gray-300 leading-tight line-clamp-1">
                                            {w.meaningText}
                                        </span>
                                    )}
                                </div>
                                <ChevronRightIcon className="h-4 w-4 text-gray-200 dark:text-gray-700 group-hover:text-blue-400 dark:group-hover:text-blue-500 shrink-0 transition-colors" />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Kanji card (small, used in vocab results) ─────────────────────────
function KanjiCard({ kanji, onClick }: { kanji: DictionaryKanjiInfo; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-stretch rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-sm transition-all text-left group overflow-hidden"
        >
            <div className="w-11 flex items-center justify-center bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors border-r border-gray-200 dark:border-gray-700 shrink-0">
                <span className="text-2xl font-black text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none py-2">
                    {kanji.character}
                </span>
            </div>
            <div className="px-2.5 py-2 min-w-0 flex flex-col justify-center gap-0.5">
                {kanji.meaning && (
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-200 leading-tight line-clamp-1 max-w-[6rem]">
                        {kanji.meaning}
                    </p>
                )}
                <div className="flex flex-wrap gap-1">
                    {kanji.onyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold leading-none border border-orange-100 dark:border-orange-900/50 whitespace-nowrap">
                            音 {kanji.onyomi.split(/[・、]/)[0]}
                        </span>
                    )}
                    {kanji.kunyomi && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold leading-none border border-blue-100 dark:border-blue-900/50 whitespace-nowrap">
                            訓 {kanji.kunyomi.split(/[・、]/)[0]}
                        </span>
                    )}
                    {kanji.stroke != null && (
                        <span className="text-[9px] text-gray-400 leading-none self-center">{kanji.stroke}nét</span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ── Example row ───────────────────────────────────────────────────────
function ExampleRow({ example, index }: { example: DictionaryExampleInfo; index: number }) {
    return (
        <div className="flex gap-2.5 px-4 py-3">
            <span className="text-[10px] font-black text-gray-300 dark:text-gray-600 shrink-0 w-4 pt-0.5 tabular-nums">
                {index}.
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                    {example.rootExample}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5 leading-snug font-medium">
                    {example.toExample}
                </p>
            </div>
        </div>
    );
}

// ── Featured word chip ────────────────────────────────────────────────
function FeaturedWordChip({ word, onClick }: { word: WordSearchResult; onClick: (w: string) => void }) {
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    return (
        <button
            onClick={() => onClick(word.word)}
            className="flex items-center gap-3 px-3 py-2.5 bg-white dark:bg-gray-900 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 transition-colors text-left group"
        >
            <div className="flex flex-col items-center shrink-0 min-w-[3rem]">
                <span className={`text-xl font-black leading-none whitespace-nowrap ${jlpt ? jlpt.text : "text-gray-700 dark:text-gray-200"} group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
                    {word.word}
                </span>
                {word.reading && word.reading !== word.word && (
                    <span className="text-[9px] text-gray-400 leading-tight mt-0.5 whitespace-nowrap">
                        {word.reading}
                    </span>
                )}
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight line-clamp-1">
                    {word.meaningText}
                </p>
                <div className="flex items-center gap-1">
                    {jlpt && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full border ${jlpt.badge}`}>
                            {word.levelCode}
                        </span>
                    )}
                    {rep && (
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${rep.style}`}>
                            {rep.label}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
}

// ── Featured kanji chip ───────────────────────────────────────────────
function FeaturedKanjiChip({ kanji, onClick }: { kanji: DictionaryKanjiDetail; onClick: (ch: string) => void }) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    return (
        <button
            onClick={() => onClick(kanji.character)}
            className={`flex flex-col items-center px-3 py-2 rounded-xl border transition-all hover:shadow-sm hover:border-blue-400 dark:hover:border-blue-500 group ${
                jlpt
                    ? `${jlpt.soft} ${jlpt.softDark} border-transparent`
                    : "bg-gray-50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700"
            }`}
        >
            <span className={`text-2xl font-black leading-none ${jlpt ? jlpt.text : "text-gray-700 dark:text-gray-200"} group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors`}>
                {kanji.character}
            </span>
            {kanji.meaning && (
                <span className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight mt-0.5 max-w-[3.5rem] truncate text-center">
                    {kanji.meaning}
                </span>
            )}
            {jlpt && (
                <span className={`text-[8px] font-black mt-0.5 ${jlpt.text}`}>
                    {kanji.jlptLevel}
                </span>
            )}
        </button>
    );
}

// ── Icons ─────────────────────────────────────────────────────────────
function SearchIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    );
}
function ClockIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
function CopyIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
    );
}
function CheckIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
    );
}
function BookIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
}
function BookOpenIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
    );
}
function ChevronIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
    );
}
function PenIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H8v-2.414a2 2 0 01.586-1.414z" />
        </svg>
    );
}
function ChevronRightIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
    );
}
function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}