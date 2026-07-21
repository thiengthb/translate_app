import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, SearchX } from "lucide-react";

import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult } from "@/types";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
    CopyButton,
    LevelBadge,
    LoginToSaveButton,
    SpeakButton,
    useDebounced,
} from "../guest-ui";

/** Tách nghĩa theo ngôn ngữ; ưu tiên tiếng Việt lên đầu. */
function orderedMeanings(w: WordSearchResult) {
    const list = w.meanings ?? [];
    const vi = list.filter((m) => (m.languageCode ?? "").toLowerCase().startsWith("vi"));
    const rest = list.filter((m) => !(m.languageCode ?? "").toLowerCase().startsWith("vi"));
    return [...vi, ...rest];
}

function WordCard({ word }: { word: WordSearchResult }) {
    const [open, setOpen] = useState(false);
    const meanings = orderedMeanings(word);
    const speakText = word.word || word.reading || "";

    // Câu ví dụ thực tế (Tatoeba) — chỉ tải khi người dùng mở chi tiết.
    const { data: examples, isFetching: exLoading } = useQuery({
        queryKey: ["guest-examples", speakText],
        queryFn: () => dictionaryApi.examples(speakText, 4),
        enabled: open && speakText.length > 0,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    return (
        <Card className="p-0 overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-accent/40 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="text-2xl font-bold leading-tight">{word.word}</span>
                        {word.reading && word.reading !== word.word && (
                            <span className="text-base text-muted-foreground">{word.reading}</span>
                        )}
                        <LevelBadge level={word.levelCode} />
                    </div>
                    {word.meaningText && (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                            {word.meaningText}
                        </p>
                    )}
                </div>
                <ChevronDown
                    size={18}
                    className={cn(
                        "mt-1 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180",
                    )}
                />
            </button>

            {open && (
                <div className="border-t px-4 py-3 flex flex-col gap-3">
                    <div className="flex items-center gap-1">
                        <SpeakButton text={speakText} />
                        <CopyButton text={speakText} />
                        <div className="ml-auto">
                            <LoginToSaveButton />
                        </div>
                    </div>

                    {/* Nghĩa */}
                    {meanings.length > 0 ? (
                        <ul className="flex flex-col gap-1.5">
                            {meanings.map((m, i) => (
                                <li key={i} className="text-sm flex gap-2">
                                    <span className="mt-0.5 text-xs font-medium text-primary shrink-0">
                                        {(m.languageCode ?? "").toUpperCase() || "•"}
                                    </span>
                                    <span>{m.name}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        word.meaningText && <p className="text-sm">{word.meaningText}</p>
                    )}

                    {/* Kanji trong từ */}
                    {word.kanjis?.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {word.kanjis.map((k, i) => (
                                <span
                                    key={i}
                                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                                    title={k.meaning ?? undefined}
                                >
                                    <span className="text-lg font-semibold">{k.character}</span>
                                    {k.meaning && (
                                        <span className="text-xs text-muted-foreground">
                                            {k.meaning}
                                        </span>
                                    )}
                                </span>
                            ))}
                        </div>
                    )}

                    {/* Câu ví dụ */}
                    <div>
                        <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            Câu ví dụ
                            {exLoading && <Loader2 size={12} className="animate-spin" />}
                        </div>
                        {examples && examples.length > 0 ? (
                            <ul className="flex flex-col gap-2">
                                {examples.map((ex, i) => (
                                    <li key={ex.sentenceId ?? i} className="rounded-md bg-muted/40 p-2.5">
                                        <div className="flex items-start gap-1">
                                            <p className="flex-1 text-sm">{ex.japanese}</p>
                                            <SpeakButton text={ex.japanese} className="h-7 w-7" />
                                        </div>
                                        {ex.reading && (
                                            <p className="text-xs text-muted-foreground">{ex.reading}</p>
                                        )}
                                        {ex.translation && (
                                            <p className="text-sm text-muted-foreground">
                                                {ex.translation}
                                            </p>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            !exLoading && (
                                <p className="text-xs text-muted-foreground">
                                    Chưa có câu ví dụ cho từ này.
                                </p>
                            )
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

export function WordSearchPanel({ query }: { query: string }) {
    const debounced = useDebounced(query.trim());

    const { data, isFetching, isError } = useQuery({
        queryKey: ["guest-word-search", debounced],
        queryFn: () => dictionaryApi.search(debounced, 20),
        enabled: debounced.length > 0,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    if (!debounced) return null;

    if (isFetching && !data) {
        return (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="animate-spin mr-2" size={18} /> Đang tìm…
            </div>
        );
    }

    if (isError) {
        return (
            <p className="py-10 text-center text-sm text-destructive">
                Tra cứu thất bại. Vui lòng thử lại.
            </p>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
                <SearchX size={28} />
                <p className="text-sm">
                    Không tìm thấy từ nào cho “<span className="font-medium">{debounced}</span>”.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2.5">
            <p className="text-xs text-muted-foreground">{data.length} kết quả</p>
            {data.map((w) => (
                <WordCard key={w.id} word={w} />
            ))}
        </div>
    );
}
