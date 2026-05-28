import { useState, useRef, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult, WordSuggestion, DictionaryKanjiInfo, DictionaryExampleInfo } from "@/types";
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
                <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-950 dark:via-indigo-950 dark:to-violet-950 shadow-2xl">
                    {/* Decorative layer — overflow-hidden scoped here so dropdown is never clipped */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none select-none" aria-hidden>
                        <span className="absolute -top-4 -right-2 text-white/[0.07] text-[9rem] font-black leading-none">辞</span>
                        <span className="absolute top-2 right-32 text-white/[0.04] text-5xl font-black">書</span>
                        <span className="absolute -bottom-6 -left-2 text-white/[0.06] text-[7rem] font-black leading-none">語</span>
                        <span className="absolute bottom-4 left-28 text-white/[0.03] text-4xl font-black">日</span>
                        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/[0.02] text-[14rem] font-black leading-none">本</span>
                        <div
                            className="absolute inset-0 opacity-[0.04]"
                            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }}
                        />
                    </div>

                    <div className="relative z-10 p-6">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tight mb-1">
                                    日本語辞書
                                </h1>
                                <p className="text-blue-200/80 text-sm">Từ điển Nhật – Việt toàn diện</p>
                            </div>
                            <div className="flex flex-col gap-1 items-end">
                                {["JLPT N1–N5", "Kanji・Kana・Romaji", "Tiếng Việt & Anh"].map((f) => (
                                    <span key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-medium">
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Search bar */}
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
                                        placeholder="食べる・taberu・ăn・eat..."
                                        className="text-base pl-9 pr-3 bg-white dark:bg-gray-900 border-0 h-11 rounded-xl shadow-inner"
                                        autoFocus
                                        autoComplete="off"
                                    />
                                </div>
                                <HandwritingInput
                                    onSelect={(char) => { setQuery(char); handleSearch(char); }}
                                />
                                <VoiceInput
                                    onSelect={(text) => { setQuery(text); handleSearch(text); }}
                                />
                                <Button
                                    onClick={() => handleSearch()}
                                    disabled={loading || !query.trim()}
                                    className="h-11 px-5 bg-white text-blue-700 hover:bg-blue-50 font-bold border-0 shadow-none rounded-xl shrink-0"
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

                    </div>
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-4 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                        <span className="text-lg">⚠</span>
                        {error}
                    </div>
                )}

                {/* ── Loading skeleton ── */}
                {loading && (
                    <div className="space-y-4 animate-pulse">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden">
                                <div className="h-1.5 bg-gray-200 dark:bg-gray-700" />
                                <div className="p-5 space-y-4">
                                    <div className="flex items-center gap-2">
                                        <div className="h-5 w-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                        <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full" />
                                    </div>
                                    <div className="h-12 w-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
                                    <div className="h-10 bg-blue-50 dark:bg-blue-950/20 rounded-xl" />
                                    <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                        <div className="h-16 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                                        <div className="h-16 w-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ── Results ── */}
                {!loading && results !== null && results.length > 0 && (
                    <>
                        <div className="flex items-center gap-2 px-1">
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                <span className="font-bold text-gray-600 dark:text-gray-300">{results.length}</span> kết quả cho{" "}
                                <span className="font-bold text-blue-600 dark:text-blue-400">「{searched}」</span>
                            </span>
                            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>
                        {results.map((w) => <WordCard key={w.id} word={w} onSearch={quickSearch} />)}
                    </>
                )}

                {/* ── No results ── */}
                {!loading && results !== null && results.length === 0 && (
                    <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-2xl border">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4 text-3xl select-none">
                            🔍
                        </div>
                        <p className="font-bold text-gray-700 dark:text-gray-300 text-lg">Không tìm thấy kết quả</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1.5 max-w-xs mx-auto">
                            Thử tìm bằng kanji, kana, romaji hoặc nghĩa tiếng Việt
                        </p>
                        <div className="flex flex-wrap gap-2 justify-center mt-4">
                            {QUICK_EXAMPLES.slice(0, 4).map((w) => (
                                <button key={w} onClick={() => quickSearch(w)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-900/50 font-medium">
                                    {w}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Initial empty state ── */}
                {!loading && results === null && (
                    <div className="text-center py-14">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-950/60 dark:to-indigo-950/60 mb-5 select-none shadow-inner">
                            <span className="text-5xl font-black text-blue-500/60 dark:text-blue-400/40">辞</span>
                        </div>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-1">Từ điển Nhật – Việt</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Hỗ trợ kanji, kana, romaji, nghĩa Việt và Anh</p>
                        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
                            {[
                                { icon: "🎌", label: "JLPT N1 – N5" },
                                { icon: "✍️", label: "Viết tay kanji" },
                                { icon: "🎙️", label: "Tìm bằng giọng nói" },
                                { icon: "📖", label: "Ví dụ câu thực tế" },
                            ].map(({ icon, label }) => (
                                <div key={label} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700/50 text-left">
                                    <span className="text-lg shrink-0">{icon}</span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-tight">{label}</span>
                                </div>
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
    const jlpt = JLPT[suggestion.levelCode];
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
    const jlpt     = JLPT[word.levelCode];
    const rep      = REP_LABELS[word.representationCode];
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    const copy = () => {
        navigator.clipboard.writeText(word.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-l-4 shadow-sm overflow-hidden transition-shadow hover:shadow-lg ${jlpt ? jlpt.accent : "border-l-gray-300"}`}>

            {/* Top gradient accent bar */}
            {jlpt && <div className={`h-1 ${jlpt.bar}`} />}

            {/* Card header – tinted bg */}
            <div className={`px-5 pt-4 pb-4 ${jlpt ? `${jlpt.soft} ${jlpt.softDark}` : ""}`}>

                {/* Meta row */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        {jlpt && (
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border tracking-wide ${jlpt.badge}`}>
                                {word.levelCode}
                            </span>
                        )}
                        {rep && (
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${rep.style}`}>
                                {rep.label}
                            </span>
                        )}
                        {typeLabel && (
                            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {typeLabel}
                            </span>
                        )}
                        {word.frequency && (
                            <span className="text-[11px] text-gray-400 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-100 dark:border-yellow-900/40">
                                <span className="text-yellow-500">★</span>
                                <span className="font-medium text-yellow-600 dark:text-yellow-500">#{word.frequency}</span>
                            </span>
                        )}
                    </div>
                    <button
                        onClick={copy}
                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium ${
                            copied
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"
                                : "text-gray-400 hover:text-gray-700 hover:bg-white/80 dark:hover:text-gray-300 dark:hover:bg-gray-800 bg-white/50 dark:bg-gray-800/50"
                        }`}
                    >
                        {copied ? <CheckIcon className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />}
                        {copied ? "Đã sao chép" : "Sao chép"}
                    </button>
                </div>

                {/* Word headline */}
                <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="text-5xl font-black text-gray-900 dark:text-gray-50 leading-none tracking-tight">
                        {word.word}
                    </span>
                    {word.reading && word.reading !== word.word && (
                        <span className={`text-lg font-medium leading-none ${jlpt ? jlpt.text : "text-gray-400"}`}>
                            【{word.reading}】
                        </span>
                    )}
                </div>
            </div>

            {/* Meaning callout */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                <div className={`flex items-start gap-3 px-4 py-3 rounded-xl ${jlpt ? `${jlpt.soft} ${jlpt.softDark}` : "bg-gray-50 dark:bg-gray-800"} border ${jlpt ? "border-transparent" : "border-gray-100 dark:border-gray-700"}`}>
                    <div className={`w-0.5 rounded-full self-stretch shrink-0 ${jlpt ? jlpt.bar : "bg-gray-300"}`} />
                    <p className="text-base font-semibold text-gray-800 dark:text-gray-100 leading-snug">
                        {word.meaningText}
                    </p>
                </div>
            </div>

            {/* Kanji section */}
            {word.kanjis.length > 0 && (
                <div className="px-5 pt-3.5 pb-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
                        <span>漢</span>
                        <span>Hán tự trong từ</span>
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {word.kanjis.map((k) => (
                            <KanjiCard key={k.character} kanji={k} onClick={() => onSearch(k.character ?? "")} />
                        ))}
                    </div>
                </div>
            )}

            {/* Examples accordion */}
            {word.examples.length > 0 && (
                <>
                    <button
                        onClick={() => setShowEx((v) => !v)}
                        className="w-full px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100 dark:hover:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors"
                    >
                        <span className="flex items-center gap-2">
                            <BookIcon className="h-3.5 w-3.5" />
                            Ví dụ câu ({word.examples.length})
                        </span>
                        <ChevronIcon className={`h-4 w-4 transition-transform duration-200 ${showEx ? "rotate-180" : ""}`} />
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

// ── Kanji card ────────────────────────────────────────────────────────
function KanjiCard({ kanji, onClick }: { kanji: DictionaryKanjiInfo; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="flex items-stretch gap-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all text-left group overflow-hidden"
        >
            {/* Big character column */}
            <div className="w-14 flex items-center justify-center bg-gray-50 dark:bg-gray-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/40 transition-colors border-r border-gray-200 dark:border-gray-700 shrink-0 py-3">
                <span className="text-3xl font-black text-gray-800 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-none">
                    {kanji.character}
                </span>
            </div>

            {/* Info column */}
            <div className="px-3 py-2.5 min-w-0 flex flex-col justify-center gap-1">
                {kanji.meaning && (
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-200 leading-tight line-clamp-2 max-w-[7rem]">
                        {kanji.meaning}
                    </p>
                )}
                {kanji.stroke != null && (
                    <p className="text-[10px] text-gray-400 leading-none">{kanji.stroke} nét</p>
                )}
                {(kanji.onyomi || kanji.kunyomi) && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                        {kanji.onyomi && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 font-bold leading-none border border-orange-100 dark:border-orange-900/50 whitespace-nowrap">
                                音 {kanji.onyomi}
                            </span>
                        )}
                        {kanji.kunyomi && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-bold leading-none border border-blue-100 dark:border-blue-900/50 whitespace-nowrap">
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
        <div className="flex gap-3 px-5 py-4">
            <span className="text-[11px] font-black text-gray-300 dark:text-gray-600 mt-0.5 shrink-0 w-5 pt-0.5 tabular-nums">
                {index}.
            </span>
            <div className="min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-relaxed">
                    {example.rootExample}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 leading-relaxed font-medium">
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