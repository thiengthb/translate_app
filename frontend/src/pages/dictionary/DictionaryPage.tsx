import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
    Search, Clock, Copy, Check, Book, BookOpen, ChevronDown, ChevronRight,
    Pen, Loader2, Volume2, Bookmark, BookmarkCheck, X, Star, GitBranch,
    Sparkles, Trash2, AlertCircle,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type {
    WordSearchResult, WordSuggestion, DictionaryKanjiInfo,
    DictionaryExampleInfo, DictionaryKanjiDetail, FeaturedResult,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HandwritingInput } from "./HandwritingInput";
import { VoiceInput } from "./VoiceInput";
import { KanjiStrokeOrder } from "./KanjiStrokeOrder";
import { KanjiBreakdown } from "./KanjiBreakdown";

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

const JLPT: Record<string, { badge: string; bar: string; accent: string; text: string }> = {
    N1: { badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          bar: "bg-red-500", accent: "border-l-red-500", text: "text-red-600 dark:text-red-400" },
    N2: { badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          bar: "bg-orange-500", accent: "border-l-orange-500", text: "text-orange-600 dark:text-orange-400" },
    N3: { badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
          bar: "bg-yellow-500", accent: "border-l-yellow-500", text: "text-yellow-700 dark:text-yellow-400" },
    N4: { badge: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
          bar: "bg-green-500", accent: "border-l-green-500", text: "text-green-600 dark:text-green-400" },
    N5: { badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          bar: "bg-blue-500", accent: "border-l-blue-500", text: "text-blue-600 dark:text-blue-400" },
};

const REP_LABELS: Record<string, { label: string; className: string }> = {
    KANJI:    { label: "漢字", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
    HIRAGANA: { label: "ひら", className: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30" },
    KATAKANA: { label: "カナ", className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
    MIXED:    { label: "混合", className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
};

const HISTORY_KEY = "dict_search_history";
const MAX_HISTORY = 10;
const SAVED_WORDS_KEY  = "dict_saved_words";
const SAVED_KANJIS_KEY = "dict_saved_kanjis";

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

function loadSavedWords(): WordSearchResult[] {
    try { return JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) ?? "[]"); }
    catch { return []; }
}
function loadSavedKanjis(): DictionaryKanjiDetail[] {
    try { return JSON.parse(localStorage.getItem(SAVED_KANJIS_KEY) ?? "[]"); }
    catch { return []; }
}
function toggleSavedWord(word: WordSearchResult): WordSearchResult[] {
    const saved = loadSavedWords();
    const idx   = saved.findIndex((w) => w.id === word.id);
    const next  = idx >= 0 ? saved.filter((_, i) => i !== idx) : [word, ...saved];
    localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(next));
    return next;
}
function toggleSavedKanji(kanji: DictionaryKanjiDetail): DictionaryKanjiDetail[] {
    const saved = loadSavedKanjis();
    const idx   = saved.findIndex((k) => k.character === kanji.character);
    const next  = idx >= 0 ? saved.filter((_, i) => i !== idx) : [kanji, ...saved];
    localStorage.setItem(SAVED_KANJIS_KEY, JSON.stringify(next));
    return next;
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

    const [savedWords,  setSavedWords]  = useState<WordSearchResult[]>(loadSavedWords);
    const [savedKanjis, setSavedKanjis] = useState<DictionaryKanjiDetail[]>(loadSavedKanjis);
    const [showSaved,   setShowSaved]   = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const wrapRef  = useRef<HTMLDivElement>(null);
    const debouncedQ = useDebounce(query, 250);

    useEffect(() => {
        dictionaryApi.featured().then(setFeatured).catch(() => {});
    }, []);

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

    const savedWordIds    = useMemo(() => new Set(savedWords.map((w) => w.id)),         [savedWords]);
    const savedKanjiChars = useMemo(() => new Set(savedKanjis.map((k) => k.character)), [savedKanjis]);

    const handleToggleSaveWord  = (word: WordSearchResult)    => setSavedWords(toggleSavedWord(word));
    const handleToggleSaveKanji = (kanji: DictionaryKanjiDetail) => setSavedKanjis(toggleSavedKanji(kanji));
    const handleClearAllSaved   = () => {
        localStorage.removeItem(SAVED_WORDS_KEY);
        localStorage.removeItem(SAVED_KANJIS_KEY);
        setSavedWords([]);
        setSavedKanjis([]);
    };

    const hasVocabResults = !loading && results !== null;
    const hasKanjiResults = !loading && kanjiResults !== null;
    const noResults = (hasVocabResults && results!.length === 0) || (hasKanjiResults && kanjiResults!.length === 0);
    const totalSaved = savedWords.length + savedKanjis.length;

    return (
        <MainLayout pathName={{ "/dictionary": "Từ điển Nhật-Việt" }}>
            <div className="w-full max-w-4xl mx-auto space-y-4">

                {/* ── Hero / Search card ───────────────────────────── */}
                <Card className="relative">
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary/10 via-background to-background pointer-events-none" />
                    <CardContent className="relative space-y-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                                    <Book className="h-5 w-5 text-primary" />
                                    Từ điển Nhật - Việt
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Tra từ vựng, kanji, kana, romaji hoặc tiếng Việt
                                </p>
                            </div>
                            <Button
                                variant={showSaved ? "default" : "outline"}
                                size="sm"
                                onClick={() => setShowSaved((v) => !v)}
                                className="gap-1.5 shrink-0"
                            >
                                <Bookmark className="h-4 w-4" />
                                <span>Đã lưu</span>
                                {totalSaved > 0 && (
                                    <Badge variant={showSaved ? "secondary" : "default"} className="ml-0.5 px-1.5 h-4 text-[10px]">
                                        {totalSaved}
                                    </Badge>
                                )}
                            </Button>
                        </div>

                        {/* ── Search bar ── */}
                        <div ref={wrapRef} className="relative">
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
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
                                        className="pl-9"
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
                                    className="shrink-0"
                                >
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tìm"}
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
                                </Card>
                            )}
                        </div>

                        {/* ── Mode tabs ── */}
                        <Tabs value={searchMode} onValueChange={(v) => setSearchMode(v as SearchMode)}>
                            <TabsList className="grid w-full max-w-xs grid-cols-2 mx-auto">
                                <TabsTrigger value="vocabulary" className="gap-1.5">
                                    <BookOpen className="h-3.5 w-3.5" />
                                    Từ vựng
                                </TabsTrigger>
                                <TabsTrigger value="kanji" className="gap-1.5">
                                    <span className="font-black text-sm leading-none">漢</span>
                                    Kanji
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Result count */}
                        {searched && (
                            <div className="flex items-center gap-2 pt-1">
                                <Separator className="flex-1" />
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {loading ? (
                                        <span className="flex items-center gap-1.5">
                                            <Loader2 className="h-3 w-3 animate-spin" />Đang tìm...
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
                                <Separator className="flex-1" />
                            </div>
                        )}
                    </CardContent>
                </Card>

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
                            <WordCard key={w.id} word={w} onSearch={quickSearch}
                                savedIds={savedWordIds} onToggleSave={handleToggleSaveWord} />
                        ))}
                    </div>
                )}

                {/* ── Kanji results ── */}
                {hasKanjiResults && kanjiResults!.length > 0 && (
                    <div className="space-y-3">
                        {kanjiResults!.map((k) => (
                            <KanjiDetailCard key={k.character} kanji={k} onVocabSearch={quickVocabSearch}
                                savedChars={savedKanjiChars} onToggleSave={handleToggleSaveKanji} />
                        ))}
                    </div>
                )}

                {/* ── Saved section ── */}
                {showSaved && !searched && !loading && (
                    <SavedSection
                        savedWords={savedWords}
                        savedKanjis={savedKanjis}
                        onSearchWord={(w) => { setShowSaved(false); quickSearch(w); }}
                        onSearchKanji={(ch) => { setShowSaved(false); setSearchMode("kanji"); setQuery(ch); handleSearch(ch, "kanji"); }}
                        onRemoveWord={handleToggleSaveWord}
                        onRemoveKanji={handleToggleSaveKanji}
                        onClearAll={handleClearAllSaved}
                    />
                )}

                {/* ── Featured ── */}
                {!loading && featured && !showSaved && !searched && (
                    <FeaturedSection
                        featured={featured}
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
                    <Card>
                        <CardContent className="flex flex-col items-center py-10 gap-2">
                            <Search className="h-10 w-10 text-muted-foreground/30" />
                            <p className="font-semibold text-foreground">Không tìm thấy kết quả</p>
                            <p className="text-xs text-muted-foreground text-center max-w-xs">
                                {searchMode === "kanji"
                                    ? "Thử nhập từ vựng, kanji, kana hoặc romaji"
                                    : "Thử nhập kanji, kana, romaji hoặc nghĩa tiếng Việt"}
                            </p>
                        </CardContent>
                    </Card>
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
function WordCard({ word, onSearch, savedIds, onToggleSave }: {
    word: WordSearchResult;
    onSearch: (w: string) => void;
    savedIds: Set<number>;
    onToggleSave: (word: WordSearchResult) => void;
}) {
    const [showEx, setShowEx] = useState(false);
    const [copied, setCopied] = useState(false);
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    const typeLabel = word.wordType ? (WORD_TYPE_LABELS[word.wordType] ?? word.wordType) : null;

    const copy = () => {
        navigator.clipboard.writeText(word.word);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <Card className={`overflow-hidden gap-0 py-0 border-l-4 transition-shadow hover:shadow-md ${jlpt ? jlpt.accent : "border-l-border"}`}>
            {jlpt && <div className={`h-1 ${jlpt.bar}`} />}

            {/* Header */}
            <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap mb-2">
                            <span className="text-3xl font-bold text-foreground leading-none tracking-tight">
                                {word.word}
                            </span>
                            {word.reading && word.reading !== word.word && (
                                <span className={`text-base font-medium leading-none ${jlpt ? jlpt.text : "text-muted-foreground"}`}>
                                    【{word.reading}】
                                </span>
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
                        <SpeakButton text={word.reading || word.word} />
                        <BookmarkButton saved={savedIds.has(word.id)} onToggle={() => onToggleSave(word)} />
                        <Button size="sm" variant="ghost" onClick={copy} className="h-8 px-2 text-xs">
                            {copied
                                ? <><Check className="h-3 w-3 text-green-600 dark:text-green-400" />Đã copy</>
                                : <><Copy className="h-3 w-3" />Copy</>}
                        </Button>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Meaning */}
            <div className="px-5 py-3">
                <p className="text-sm font-medium text-foreground leading-snug">{word.meaningText}</p>
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
                                    <ExampleRow key={i} example={ex} index={i + 1} />
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}
        </Card>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Kanji detail card
// ══════════════════════════════════════════════════════════════════════
function KanjiDetailCard({ kanji, onVocabSearch, savedChars, onToggleSave }: {
    kanji: DictionaryKanjiDetail;
    onVocabSearch: (w: string) => void;
    savedChars: Set<string>;
    onToggleSave: (kanji: DictionaryKanjiDetail) => void;
}) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    const splitReadings = (s: string | undefined) =>
        s ? s.split(/[・、,,\s]+/).map((r) => r.trim()).filter(Boolean) : [];
    const onyomiList  = splitReadings(kanji.onyomi);
    const kunyomiList = splitReadings(kanji.kunyomi);
    const [showStrokeOrder, setShowStrokeOrder] = useState(false);
    const [showBreakdown,   setShowBreakdown]   = useState(false);

    return (
        <Card className={`overflow-hidden gap-0 py-0 border-l-4 transition-shadow hover:shadow-md ${jlpt ? jlpt.accent : "border-l-border"}`}>
            {jlpt && <div className={`h-1.5 ${jlpt.bar}`} />}

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
                            <SpeakButton text={kanji.character} />
                            <BookmarkButton saved={savedChars.has(kanji.character)} onToggle={() => onToggleSave(kanji)} />
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
                                        <span key={r} className="text-sm font-semibold px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20">
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
                                        <span key={r} className="text-sm font-semibold px-2.5 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20">
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
                                <span className="text-lg font-bold text-foreground w-14 shrink-0 group-hover:text-primary transition-colors">
                                    {w.word}
                                </span>
                                <div className="flex-1 min-w-0">
                                    {w.reading && w.reading !== w.word && (
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
function ExampleRow({ example, index }: { example: DictionaryExampleInfo; index: number }) {
    return (
        <div className="flex gap-3 px-5 py-3">
            <span className="text-[10px] font-bold text-muted-foreground/60 shrink-0 w-4 pt-0.5 tabular-nums">
                {index}.
            </span>
            <div className="min-w-0">
                <p className="font-medium text-foreground text-sm leading-snug">{example.rootExample}</p>
                <p className="text-sm text-primary mt-0.5 leading-snug">{example.toExample}</p>
            </div>
        </div>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Featured section
// ══════════════════════════════════════════════════════════════════════
function FeaturedSection({ featured, onWordClick, onKanjiClick }: {
    featured: FeaturedResult;
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
                        {featured.words.map((w) => (
                            <FeaturedWordChip key={w.id} word={w} onClick={onWordClick} />
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
                    <div className="flex flex-wrap gap-2 p-3">
                        {featured.kanjis.map((k) => (
                            <FeaturedKanjiChip key={k.character} kanji={k} onClick={onKanjiClick} />
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
}

function FeaturedWordChip({ word, onClick }: { word: WordSearchResult; onClick: (w: string) => void }) {
    const jlpt = JLPT[word.levelCode ?? ""];
    const rep  = REP_LABELS[word.representationCode ?? ""];
    return (
        <button
            onClick={() => onClick(word.word)}
            className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 transition-colors text-left group"
        >
            <div className="flex flex-col items-center shrink-0 min-w-[3rem]">
                <span className={`text-xl font-bold leading-none whitespace-nowrap ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                    {word.word}
                </span>
                {word.reading && word.reading !== word.word && (
                    <span className="text-[9px] text-muted-foreground leading-tight mt-1 whitespace-nowrap">
                        {word.reading}
                    </span>
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
    return (
        <button
            onClick={() => onClick(kanji.character)}
            className="flex flex-col items-center px-3 py-2 rounded-lg border bg-card hover:border-primary/40 hover:shadow-sm transition-all group"
        >
            <span className={`text-2xl font-bold leading-none ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                {kanji.character}
            </span>
            {kanji.meaning && (
                <span className="text-[9px] text-muted-foreground leading-tight mt-1 max-w-[3.5rem] truncate text-center">
                    {kanji.meaning}
                </span>
            )}
            {jlpt && (
                <span className={`text-[8px] font-black mt-0.5 ${jlpt.text}`}>{kanji.jlptLevel}</span>
            )}
        </button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Speak button
// ══════════════════════════════════════════════════════════════════════
function SpeakButton({ text }: { text: string }) {
    const [speaking, setSpeaking] = useState(false);

    const speak = () => {
        if (!window.speechSynthesis) return;
        if (speaking) {
            window.speechSynthesis.cancel();
            setSpeaking(false);
            return;
        }
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "ja-JP";
        utt.rate = 0.85;
        utt.onstart = () => setSpeaking(true);
        utt.onend   = () => setSpeaking(false);
        utt.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(utt);
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

// ══════════════════════════════════════════════════════════════════════
// Bookmark button
// ══════════════════════════════════════════════════════════════════════
function BookmarkButton({ saved, onToggle }: { saved: boolean; onToggle: () => void }) {
    return (
        <Button
            onClick={onToggle}
            size="icon-sm"
            variant="ghost"
            title={saved ? "Bỏ lưu" : "Lưu từ này"}
            className={saved ? "text-yellow-500 hover:text-yellow-600" : ""}
        >
            {saved ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
        </Button>
    );
}

// ══════════════════════════════════════════════════════════════════════
// Saved section
// ══════════════════════════════════════════════════════════════════════
function SavedSection({
    savedWords, savedKanjis, onSearchWord, onSearchKanji, onRemoveWord, onRemoveKanji, onClearAll,
}: {
    savedWords: WordSearchResult[];
    savedKanjis: DictionaryKanjiDetail[];
    onSearchWord: (w: string) => void;
    onSearchKanji: (ch: string) => void;
    onRemoveWord: (w: WordSearchResult) => void;
    onRemoveKanji: (k: DictionaryKanjiDetail) => void;
    onClearAll: () => void;
}) {
    if (savedWords.length === 0 && savedKanjis.length === 0) {
        return (
            <Card>
                <CardContent className="flex flex-col items-center py-12 gap-3">
                    <Bookmark className="h-9 w-9 text-muted-foreground/30" />
                    <p className="font-semibold text-foreground">Chưa có từ nào được lưu</p>
                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                        Nhấn nút <Bookmark className="inline h-3 w-3 mx-0.5 align-middle" /> trên kết quả tìm kiếm để bookmark từ yêu thích
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {savedWords.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Từ vựng đã lưu</p>
                        <span className="ml-auto text-xs text-muted-foreground">{savedWords.length} từ</span>
                    </div>
                    <Separator />
                    <div className="divide-y">
                        {savedWords.map((w) => (
                            <SavedWordRow key={w.id} word={w} onSearch={onSearchWord} onRemove={() => onRemoveWord(w)} />
                        ))}
                    </div>
                </Card>
            )}

            {savedKanjis.length > 0 && (
                <Card className="gap-0 py-0 overflow-hidden">
                    <div className="px-5 py-3 flex items-center gap-2">
                        <BookmarkCheck className="h-4 w-4 text-yellow-500" />
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Kanji đã lưu</p>
                        <span className="ml-auto text-xs text-muted-foreground">{savedKanjis.length} kanji</span>
                    </div>
                    <Separator />
                    <div className="flex flex-wrap gap-2 p-3">
                        {savedKanjis.map((k) => (
                            <SavedKanjiChip key={k.character} kanji={k} onSearch={onSearchKanji} onRemove={() => onRemoveKanji(k)} />
                        ))}
                    </div>
                </Card>
            )}

            <div className="flex justify-center">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearAll}
                    className="text-muted-foreground hover:text-destructive gap-1.5"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                    Xóa tất cả đã lưu
                </Button>
            </div>
        </div>
    );
}

function SavedWordRow({ word, onSearch, onRemove }: {
    word: WordSearchResult; onSearch: (w: string) => void; onRemove: () => void;
}) {
    const jlpt = JLPT[word.levelCode ?? ""];
    return (
        <div className="flex items-center gap-3 px-4 py-2.5 group hover:bg-accent/50 transition-colors">
            <button onClick={() => onSearch(word.word)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className="flex flex-col shrink-0 min-w-[3rem]">
                    <span className={`text-lg font-bold leading-tight ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                        {word.word}
                    </span>
                    {word.reading && word.reading !== word.word && (
                        <span className="text-[9px] text-muted-foreground leading-tight">{word.reading}</span>
                    )}
                </div>
                <span className="flex-1 text-xs text-muted-foreground leading-tight line-clamp-1">{word.meaningText}</span>
                {jlpt && (
                    <Badge variant="outline" className={`text-[9px] font-bold px-1.5 py-0 h-4 shrink-0 ${jlpt.badge}`}>
                        {word.levelCode}
                    </Badge>
                )}
            </button>
            <button
                onClick={onRemove}
                title="Bỏ lưu"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
            ><X className="h-3 w-3" /></button>
        </div>
    );
}

function SavedKanjiChip({ kanji, onSearch, onRemove }: {
    kanji: DictionaryKanjiDetail; onSearch: (ch: string) => void; onRemove: () => void;
}) {
    const jlpt = kanji.jlptLevel ? JLPT[kanji.jlptLevel] : null;
    return (
        <div className="relative group">
            <button
                onClick={() => onSearch(kanji.character)}
                className="flex flex-col items-center px-3 py-2 rounded-lg border bg-card hover:border-primary/40 hover:shadow-sm transition-all"
            >
                <span className={`text-2xl font-bold leading-none ${jlpt ? jlpt.text : "text-foreground"} group-hover:text-primary transition-colors`}>
                    {kanji.character}
                </span>
                {kanji.meaning && (
                    <span className="text-[9px] text-muted-foreground leading-tight mt-1 max-w-[3.5rem] truncate text-center">
                        {kanji.meaning}
                    </span>
                )}
                {jlpt && <span className={`text-[8px] font-black mt-0.5 ${jlpt.text}`}>{kanji.jlptLevel}</span>}
            </button>
            <button
                onClick={onRemove}
                title="Bỏ lưu"
                className="absolute -top-1.5 -right-1.5 h-4 w-4 flex items-center justify-center rounded-full bg-destructive/15 text-destructive opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-destructive/25"
            ><X className="h-2.5 w-2.5" /></button>
        </div>
    );
}