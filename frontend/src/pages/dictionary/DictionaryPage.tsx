import { useState, useRef, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult, WordSuggestion, DictionaryKanjiInfo, DictionaryExampleInfo } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

const JLPT: Record<string, { badge: string; bar: string }> = {
    N1: { badge: "bg-red-100 text-red-700 border-red-200",          bar: "bg-gradient-to-r from-red-500 to-rose-500" },
    N2: { badge: "bg-orange-100 text-orange-700 border-orange-200", bar: "bg-gradient-to-r from-orange-500 to-amber-500" },
    N3: { badge: "bg-yellow-100 text-yellow-700 border-yellow-200", bar: "bg-gradient-to-r from-yellow-400 to-orange-400" },
    N4: { badge: "bg-green-100 text-green-700 border-green-200",    bar: "bg-gradient-to-r from-green-500 to-emerald-500" },
    N5: { badge: "bg-blue-100 text-blue-700 border-blue-200",       bar: "bg-gradient-to-r from-blue-500 to-indigo-500" },
};

const REP_STYLES: Record<string, string> = {
    KANJI:    "bg-purple-100 text-purple-700",
    HIRAGANA: "bg-pink-100 text-pink-700",
    KATAKANA: "bg-cyan-100 text-cyan-700",
    MIXED:    "bg-indigo-100 text-indigo-700",
};

const QUICK_EXAMPLES = ["食べる", "水", "学校", "taberu", "mizu", "gakkou", "ăn", "nước"];
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

// ── Page ──────────────────────────────────────────────────────────────
export default function DictionaryPage() {
    const [query, setQuery]       = useState("");
    const [results, setResults]   = useState<WordSearchResult[] | null>(null);
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState<string | null>(null);
    const [searched, setSearched] = useState("");

    const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
    const [history, setHistory]         = useState<string[]>([]);
    const [dropMode, setDropMode]       = useState<"history" | "suggestions">("history");
    const [showDrop, setShowDrop]       = useState(false);
    const [activeIdx, setActiveIdx]     = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef  = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(query, 250);

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

    const handleSearch = useCallback(async (q?: string) => {
        const term = (q ?? query).trim();
        if (!term) return;
        setShowDrop(false);
        setLoading(true);
        setError(null);
        setResults(null);
        setSearched(term);
        pushHistory(term);
        setHistory(loadHistory());
        try {
            setResults(await dictionaryApi.search(term));
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Tìm kiếm thất bại.");
        } finally {
            setLoading(false);
        }
    }, [query]);

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

    const clearAllHistory = () => { localStorage.removeItem(HISTORY_KEY); setHistory([]); setShowDrop(false); };
    const removeHistoryItem = (term: string) => {
        dropHistory(term);
        const updated = loadHistory();
        setHistory(updated);
        if (!updated.length) setShowDrop(false);
    };

    return (
        <MainLayout pathName={{ "/dictionary": "Từ điển Nhật-Việt" }}>
            <div className="max-w-3xl mx-auto w-full space-y-5">

                {/* ── Hero ── */}
                <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-900 dark:via-indigo-900 dark:to-violet-950 shadow-xl">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none select-none" aria-hidden>
                        <span className="absolute -top-2 right-4 text-white/10 text-8xl font-bold">辞</span>
                        <span className="absolute bottom-0 left-6 text-white/5 text-6xl font-bold">書</span>
                    </div>
                    <div className="relative z-10 p-6">
                        <h1 className="text-2xl font-bold text-white mb-0.5">Từ điển Nhật-Việt</h1>
                        <p className="text-blue-200 text-sm mb-5">
                            Tìm bằng kanji・kana・romaji・nghĩa tiếng Việt・tiếng Anh
                        </p>

                        <div ref={wrapRef} className="relative">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <Input
                                        ref={inputRef}
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={onKeyDown}
                                        onFocus={onFocus}
                                        placeholder="食べる / taberu / ăn / eat..."
                                        className="text-base pl-9 bg-white dark:bg-gray-900 border-0 h-11"
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <Button
                                    onClick={() => handleSearch()}
                                    disabled={loading || !query.trim()}
                                    className="h-11 px-6 bg-white text-blue-700 hover:bg-blue-50 font-semibold border-0 shadow-none"
                                >
                                    {loading ? <Spinner /> : "Tìm"}
                                </Button>
                            </div>

                            {showDrop && dropItems.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                                    {dropMode === "history" ? (
                                        <>
                                            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
                                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Tìm kiếm gần đây</span>
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

                        <div className="flex flex-wrap gap-1.5 mt-3 items-center">
                            <span className="text-xs text-blue-300 mr-0.5">Thử:</span>
                            {QUICK_EXAMPLES.map((w) => (
                                <button key={w} onClick={() => quickSearch(w)}
                                    className="text-xs px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors">
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                                <div className="h-1 bg-gray-200 dark:bg-gray-700" />
                                <div className="p-5 space-y-3">
                                    <div className="flex gap-2">
                                        <div className="h-5 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    </div>
                                    <div className="h-9 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                                    <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded-md" />
                                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Results ── */}
                {!loading && results !== null && results.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 px-1">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold text-gray-700 dark:text-gray-200">{results.length}</span> kết quả cho{" "}
                                <span className="font-semibold text-blue-600 dark:text-blue-400">「{searched}」</span>
                            </span>
                        </div>
                        {results.map((w) => <WordCard key={w.id} word={w} onSearch={quickSearch} />)}
                    </>
                )}

                {/* ── No results ── */}
                {!loading && results !== null && results.length === 0 && (
                    <div className="text-center py-14 bg-white dark:bg-gray-900 rounded-2xl border">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                            <SearchIcon className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="font-semibold text-gray-700 dark:text-gray-300">Không tìm thấy kết quả</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                            Thử từ khác hoặc kiểm tra lại chính tả
                        </p>
                    </div>
                )}

                {/* ── Initial empty state ── */}
                {!loading && results === null && (
                    <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 mb-4 select-none">
                            <span className="text-4xl">辞</span>
                        </div>
                        <p className="font-semibold text-gray-600 dark:text-gray-400">Từ điển Nhật-Việt</p>
                        <p className="text-sm text-gray-400 dark:text-gray-600 mt-1 mb-5">Nhập từ để bắt đầu tra cứu</p>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {["JLPT N1 – N5", "Kanji • Kana • Romaji", "Tiếng Việt & Anh", "Ví dụ câu"].map((tag) => (
                                <span key={tag} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                                    {tag}
                                </span>
                            ))}
                        </div>
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
                <ClockIcon className="h-4 w-4 text-gray-400 shrink-0" />
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
    const badge = JLPT[suggestion.levelCode]?.badge ?? "bg-gray-100 text-gray-600 border-gray-200";
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
            onMouseEnter={onHover}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${active ? "bg-blue-50 dark:bg-blue-950" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
        >
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 w-20 shrink-0">{suggestion.word}</span>
            {suggestion.reading && suggestion.reading !== suggestion.word && (
                <span className="text-sm text-gray-500 dark:text-gray-400 w-24 shrink-0">{suggestion.reading}</span>
            )}
            <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">{suggestion.meaningText}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge}`}>{suggestion.levelCode}</span>
        </button>
    );
}

// ── Word card ─────────────────────────────────────────────────────────
function WordCard({ word, onSearch }: { word: WordSearchResult; onSearch: (w: string) => void }) {
    const [showEx, setShowEx]   = useState(false);
    const [copied, setCopied]   = useState(false);
    const jlpt     = JLPT[word.levelCode];
    const repStyle = REP_STYLES[word.representationCode] ?? "bg-gray-100 text-gray-600";
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    const copy = () => {
        navigator.clipboard.writeText(word.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            {/* JLPT gradient bar */}
            {jlpt && <div className={`h-1 ${jlpt.bar}`} />}

            <div className="p-5">
                {/* Top row: badges + copy */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {jlpt && (
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${jlpt.badge}`}>
                                {word.levelCode}
                            </span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${repStyle}`}>
                            {word.representationCode}
                        </span>
                        {typeLabel && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {typeLabel}
                            </span>
                        )}
                        {word.frequency && (
                            <span className="text-xs text-gray-400 flex items-center gap-0.5 px-1">
                                <span className="text-yellow-400">★</span> #{word.frequency}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={copy}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all ${
                            copied
                                ? "bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400"
                                : "text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800"
                        }`}
                    >
                        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                        <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
                    </button>
                </div>

                {/* Word + reading */}
                <div className="mb-2">
                    <div className="flex items-baseline gap-2.5 flex-wrap">
                        <span className="text-4xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                            {word.word}
                        </span>
                        {word.reading && word.reading !== word.word && (
                            <span className="text-xl text-gray-400 dark:text-gray-500 font-normal">
                                【{word.reading}】
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-lg font-semibold text-blue-600 dark:text-blue-400 leading-snug">
                        {word.meaningText}
                    </p>
                </div>

                {/* Kanji section */}
                {word.kanjis.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
                            Hán tự
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {word.kanjis.map((k) => (
                                <KanjiCard key={k.character} kanji={k} onClick={() => onSearch(k.character ?? "")} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Examples accordion */}
            {word.examples.length > 0 && (
                <>
                    <button
                        onClick={() => setShowEx((v) => !v)}
                        className="w-full px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/70 hover:bg-gray-100 dark:hover:bg-gray-800 border-t flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <BookIcon className="h-3.5 w-3.5" />
                            Ví dụ ({word.examples.length})
                        </span>
                        <ChevronIcon className={`h-4 w-4 transition-transform duration-200 ${showEx ? "rotate-180" : ""}`} />
                    </button>
                    {showEx && (
                        <div className="border-t bg-gray-50 dark:bg-gray-800/50 divide-y divide-gray-100 dark:divide-gray-700/50">
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

// ── Kanji card ────────────────────────────────────────────────────────
function KanjiCard({ kanji, onClick }: { kanji: DictionaryKanjiInfo; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 transition-all hover:shadow-sm text-left group"
        >
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-none mt-0.5 shrink-0">
                {kanji.character}
            </span>
            <div className="min-w-0">
                {kanji.meaning && (
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 leading-tight">
                        {kanji.meaning}
                    </p>
                )}
                {kanji.stroke != null && (
                    <p className="text-xs text-gray-400 leading-tight mt-0.5">{kanji.stroke} nét</p>
                )}
                {(kanji.onyomi || kanji.kunyomi) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {kanji.onyomi && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-medium leading-none border border-orange-100 dark:border-orange-900/50">
                                音 {kanji.onyomi}
                            </span>
                        )}
                        {kanji.kunyomi && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium leading-none border border-blue-100 dark:border-blue-900/50">
                                訓 {kanji.kunyomi}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
}

// ── Example row ───────────────────────────────────────────────────────
function ExampleRow({ example, index }: { example: DictionaryExampleInfo; index: number }) {
    return (
        <div className="flex gap-3 px-5 py-3.5">
            <span className="text-xs font-bold text-gray-300 dark:text-gray-600 mt-0.5 shrink-0 w-4">{index}.</span>
            <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                    {example.rootExample}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-0.5 leading-relaxed">
                    {example.toExample}
                </p>
            </div>
        </div>
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
function ChevronIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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