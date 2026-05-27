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

const JLPT_STYLES: Record<string, string> = {
    N1: "bg-red-100 text-red-700 border-red-200",
    N2: "bg-orange-100 text-orange-700 border-orange-200",
    N3: "bg-yellow-100 text-yellow-700 border-yellow-200",
    N4: "bg-green-100 text-green-700 border-green-200",
    N5: "bg-blue-100 text-blue-700 border-blue-200",
};

const REP_STYLES: Record<string, string> = {
    KANJI:    "bg-purple-100 text-purple-700",
    HIRAGANA: "bg-pink-100 text-pink-700",
    KATAKANA: "bg-cyan-100 text-cyan-700",
    MIXED:    "bg-indigo-100 text-indigo-700",
};

const QUICK_EXAMPLES = ["食べる", "水", "学校", "taberu", "mizu", "gakkou", "ăn", "nước"];

// ── Debounce hook ─────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

// ── Page ──────────────────────────────────────────────────────────────
export default function DictionaryPage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<WordSearchResult[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searched, setSearched] = useState("");

    // Autocomplete state
    const [suggestions, setSuggestions] = useState<WordSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const debouncedQuery = useDebounce(query, 250);

    // Fetch suggestions when query changes
    useEffect(() => {
        if (debouncedQuery.trim().length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        dictionaryApi.suggest(debouncedQuery).then((data) => {
            setSuggestions(data);
            setShowSuggestions(data.length > 0);
            setActiveIndex(-1);
        }).catch(() => {
            setSuggestions([]);
            setShowSuggestions(false);
        });
    }, [debouncedQuery]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                inputRef.current && !inputRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSearch = useCallback(async (q?: string) => {
        const term = (q ?? query).trim();
        if (!term) return;
        setShowSuggestions(false);
        setLoading(true);
        setError(null);
        setResults(null);
        setSearched(term);
        try {
            const data = await dictionaryApi.search(term);
            setResults(data);
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Tìm kiếm thất bại.");
        } finally {
            setLoading(false);
        }
    }, [query]);

    const selectSuggestion = (s: WordSuggestion) => {
        setQuery(s.word);
        setShowSuggestions(false);
        handleSearch(s.word);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showSuggestions) {
            if (e.key === "Enter") handleSearch();
            return;
        }
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, -1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0 && suggestions[activeIndex]) {
                selectSuggestion(suggestions[activeIndex]);
            } else {
                handleSearch();
            }
        } else if (e.key === "Escape") {
            setShowSuggestions(false);
            setActiveIndex(-1);
        }
    };

    const quickSearch = (word: string) => {
        setQuery(word);
        handleSearch(word);
    };

    return (
        <MainLayout pathName={{ "/dictionary": "Từ điển Nhật-Việt" }}>
            <div className="max-w-3xl mx-auto w-full space-y-5">

                {/* Search bar */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border shadow-sm p-6">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                        Từ điển Nhật-Việt
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        Tìm bằng kanji・kana・romaji・nghĩa tiếng Việt・tiếng Anh
                    </p>

                    {/* Input + dropdown wrapper */}
                    <div className="relative">
                        <div className="flex gap-2">
                            <Input
                                ref={inputRef}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                                placeholder="食べる / taberu / ăn / eat..."
                                className="text-base flex-1"
                                autoFocus
                                autoComplete="off"
                            />
                            <Button onClick={() => handleSearch()} disabled={loading || !query.trim()} className="px-5">
                                {loading ? <Spinner /> : "Tìm"}
                            </Button>
                        </div>

                        {/* Autocomplete dropdown */}
                        {showSuggestions && suggestions.length > 0 && (
                            <div
                                ref={dropdownRef}
                                className="absolute left-0 right-12 top-full mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg overflow-hidden"
                            >
                                {suggestions.map((s, i) => (
                                    <SuggestionItem
                                        key={s.id}
                                        suggestion={s}
                                        active={i === activeIndex}
                                        onSelect={() => selectSuggestion(s)}
                                        onHover={() => setActiveIndex(i)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick examples */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                        {QUICK_EXAMPLES.map((w) => (
                            <button key={w} onClick={() => quickSearch(w)}
                                className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                {w}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
                )}

                {/* Loading skeleton */}
                {loading && (
                    <div className="space-y-3 animate-pulse">
                        {[1, 2].map((i) => (
                            <div key={i} className="bg-white dark:bg-gray-900 rounded-2xl border h-36" />
                        ))}
                    </div>
                )}

                {/* Results */}
                {!loading && results !== null && (
                    <>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {results.length > 0
                                ? `${results.length} kết quả cho "${searched}"`
                                : `Không tìm thấy từ nào cho "${searched}"`}
                        </p>
                        {results.map((word) => (
                            <WordCard key={word.id} word={word} onSearch={quickSearch} />
                        ))}
                    </>
                )}

                {/* Initial state */}
                {!loading && results === null && (
                    <div className="text-center py-16 text-gray-400 dark:text-gray-600">
                        <p className="text-4xl mb-3">辞書</p>
                        <p className="text-sm">Nhập từ để bắt đầu tra cứu</p>
                    </div>
                )}
            </div>
        </MainLayout>
    );
}

// ── Suggestion item ───────────────────────────────────────────────────
function SuggestionItem({
    suggestion, active, onSelect, onHover,
}: {
    suggestion: WordSuggestion;
    active: boolean;
    onSelect: () => void;
    onHover: () => void;
}) {
    const jlptStyle = JLPT_STYLES[suggestion.levelCode] ?? "bg-gray-100 text-gray-600";
    return (
        <button
            onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
            onMouseEnter={onHover}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                ${active
                    ? "bg-blue-50 dark:bg-blue-950"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
        >
            {/* Japanese word */}
            <span className="text-lg font-bold text-gray-900 dark:text-gray-100 w-20 shrink-0">
                {suggestion.word}
            </span>
            {/* Reading */}
            {suggestion.reading && suggestion.reading !== suggestion.word && (
                <span className="text-sm text-gray-500 dark:text-gray-400 w-24 shrink-0">
                    {suggestion.reading}
                </span>
            )}
            {/* Meaning */}
            <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
                {suggestion.meaningText}
            </span>
            {/* JLPT badge */}
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border shrink-0 ${jlptStyle}`}>
                {suggestion.levelCode}
            </span>
        </button>
    );
}

// ── Word card ─────────────────────────────────────────────────────────
function WordCard({ word, onSearch }: { word: WordSearchResult; onSearch: (w: string) => void }) {
    const [showExamples, setShowExamples] = useState(false);
    const jlptStyle = JLPT_STYLES[word.levelCode] ?? "bg-gray-100 text-gray-600";
    const repStyle = REP_STYLES[word.representationCode] ?? "bg-gray-100 text-gray-600";
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    return (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden">
            {/* Header */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{word.word}</span>
                            {word.reading && word.reading !== word.word && (
                                <span className="text-lg text-gray-500 dark:text-gray-400">{word.reading}</span>
                            )}
                        </div>
                        <p className="mt-1 text-base font-semibold text-blue-600 dark:text-blue-400">
                            {word.meaningText}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 items-start">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${jlptStyle}`}>
                            {word.levelCode}
                        </span>
                        <span className={`text-xs px-2.5 py-1 rounded-full ${repStyle}`}>
                            {word.representationCode}
                        </span>
                        {typeLabel && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                                {typeLabel}
                            </span>
                        )}
                        {word.frequency && (
                            <span className="text-xs px-2 py-1 text-gray-400">#{word.frequency}</span>
                        )}
                    </div>
                </div>

                {/* Kanjis */}
                {word.kanjis.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {word.kanjis.map((k) => (
                            <KanjiChip key={k.character} kanji={k} onClick={() => onSearch(k.character ?? "")} />
                        ))}
                    </div>
                )}
            </div>

            {/* Examples toggle */}
            {word.examples.length > 0 && (
                <>
                    <button
                        onClick={() => setShowExamples((v) => !v)}
                        className="w-full px-5 py-2.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left border-t flex items-center justify-between"
                    >
                        <span>Ví dụ ({word.examples.length})</span>
                        <span>{showExamples ? "▲" : "▼"}</span>
                    </button>
                    {showExamples && (
                        <div className="px-5 pb-4 space-y-2.5 border-t bg-gray-50 dark:bg-gray-800/50">
                            {word.examples.map((ex, i) => (
                                <ExampleRow key={i} example={ex} />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Kanji chip ────────────────────────────────────────────────────────
function KanjiChip({ kanji, onClick }: { kanji: DictionaryKanjiInfo; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            title={`音: ${kanji.onyomi ?? "—"} / 訓: ${kanji.kunyomi ?? "—"}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors group"
        >
            <span className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {kanji.character}
            </span>
            <div className="text-left">
                {kanji.meaning && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-tight">{kanji.meaning}</p>
                )}
                {kanji.stroke != null && (
                    <p className="text-xs text-gray-400 leading-tight">{kanji.stroke} nét</p>
                )}
            </div>
        </button>
    );
}

// ── Example row ───────────────────────────────────────────────────────
function ExampleRow({ example }: { example: DictionaryExampleInfo }) {
    return (
        <div className="pt-2.5">
            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{example.rootExample}</p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{example.toExample}</p>
        </div>
    );
}

// ── Spinner ───────────────────────────────────────────────────────────
function Spinner() {
    return (
        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
    );
}