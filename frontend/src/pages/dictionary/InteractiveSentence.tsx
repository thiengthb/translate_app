import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Volume2, ArrowRight, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FuriganaText } from "@/components/common/FuriganaText";
import { NotebookPicker } from "./NotebookPicker";
import { analyzeApi, type AnalyzedToken } from "@/api/features/analyze.api";
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult } from "@/types";
import { JLPT } from "./dictionaryConstants";

// Từ loại KHÔNG cho bấm (trợ từ, trợ động từ, ký hiệu, khoảng trắng…) — chỉ
// các từ "có nghĩa" (danh/động/tính từ, phó từ…) mới tra được.
const SKIP_POS = new Set(["助詞", "助動詞", "記号", "補助記号", "空白", "フィラー"]);
const JP_CHAR = /[぀-ヿ一-龯㐀-䶿々ヶ]/;

function isClickable(t: AnalyzedToken): boolean {
    if (!t.baseForm) return false;
    if (SKIP_POS.has(t.partOfSpeech)) return false;
    return JP_CHAR.test(t.surface);
}

// TTS gọn (Web Speech) — dùng trong popup.
function speak(text: string) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.9;
    const v = window.speechSynthesis.getVoices().find((x) => x.lang?.startsWith("ja"));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
}

// Bề mặt một token: có furigana (ruby) khi bật & token có cách đọc kanji.
function TokenSurface({ token, furigana }: { token: AnalyzedToken; furigana: boolean }) {
    if (furigana && token.furigana) {
        return (
            <FuriganaText
                word={token.surface}
                reading={token.furigana}
                rubyClassName="text-[0.55em] font-medium text-muted-foreground"
            />
        );
    }
    return <>{token.surface}</>;
}

/**
 * Hiển thị một câu tiếng Nhật mà mỗi từ "có nghĩa" bấm được (kiểu Mazii):
 * tách từ qua Sudachi (/api/analyze), bấm vào từ mở popup tra nhanh + nút
 * "Xem chi tiết" mở trang từ vựng. Trong lúc chờ tách từ hiển thị plain text.
 * furigana = true → chú cách đọc (hiragana) trên các từ chứa kanji.
 */
export function InteractiveSentence({ text, className, furigana = true }: {
    text: string;
    className?: string;
    furigana?: boolean;
}) {
    const { data, isLoading } = useQuery({
        queryKey: ["analyze-sentence", text],
        queryFn: () => analyzeApi.analyze(text),
        enabled: !!text?.trim(),
        staleTime: 5 * 60 * 1000,
    });

    if (isLoading || !data) {
        return <span className={className}>{text}</span>;
    }

    return (
        <span className={className}>
            {data.tokens.map((t, i) =>
                isClickable(t)
                    ? <WordToken key={i} token={t} furigana={furigana} />
                    : <span key={i}><TokenSurface token={t} furigana={furigana} /></span>,
            )}
        </span>
    );
}

function WordToken({ token, furigana }: { token: AnalyzedToken; furigana: boolean }) {
    const [open, setOpen] = useState(false);
    const [saved, setSaved] = useState(false);
    const navigate = useNavigate();
    const lemma = token.baseForm ?? token.surface;

    // Tra nhanh khi mở popup (cache theo lemma).
    const { data: hits, isLoading } = useQuery<WordSearchResult[]>({
        queryKey: ["dict-quick", lemma],
        queryFn: () => dictionaryApi.search(lemma, 1),
        enabled: open,
        staleTime: 5 * 60 * 1000,
    });
    const hit = hits?.[0];
    const jlpt = hit?.levelCode ? JLPT[hit.levelCode] : null;

    const openDetail = () => {
        if (hit) navigate(`/words/${hit.id}`);
        else navigate(`/dictionary?q=${encodeURIComponent(lemma)}`);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className="cursor-pointer rounded-sm hover:bg-primary/15 hover:text-primary transition-colors decoration-dotted underline-offset-2 hover:underline"
                >
                    <TokenSurface token={token} furigana={furigana} />
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
                <div className="p-3">
                    {/* Tiêu đề: dạng từ điển + cách đọc */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                            <span className="text-xl font-bold text-foreground leading-tight">{lemma}</span>
                            {(hit?.reading ?? token.reading) && (hit?.reading ?? token.reading) !== lemma && (
                                <span className="ml-1.5 text-sm text-muted-foreground">
                                    【{hit?.reading ?? token.reading}】
                                </span>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => speak(token.reading || lemma)}
                            title="Nghe phát âm"
                            className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                            <Volume2 className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px]">{token.partOfSpeechVi}</Badge>
                        {jlpt && hit?.levelCode && (
                            <Badge variant="outline" className={`text-[10px] font-bold ${jlpt.badge}`}>{hit.levelCode}</Badge>
                        )}
                    </div>

                    {/* Nghĩa */}
                    <div className="mt-2 text-sm leading-snug">
                        {isLoading ? (
                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang tra…
                            </span>
                        ) : hit?.meaningText ? (
                            <p className="text-foreground line-clamp-3">{hit.meaningText}</p>
                        ) : (
                            <p className="text-muted-foreground text-xs italic">Chưa có trong từ điển.</p>
                        )}
                    </div>
                </div>
                <div className="border-t p-1.5 flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="flex-1 justify-start gap-1.5" onClick={openDetail}>
                        <span className="flex items-center gap-1.5">
                            {hit ? <ArrowRight className="h-3.5 w-3.5" /> : <Search className="h-3.5 w-3.5" />}
                            {hit ? "Xem chi tiết" : `Tìm “${lemma}”`}
                        </span>
                    </Button>
                    {/* Lưu thẳng vào sổ tay khi đang đọc — chỉ khả dụng nếu từ có trong từ điển. */}
                    {hit && (
                        <NotebookPicker
                            target={{ kind: "word", wordId: hit.id }}
                            savedAnywhere={saved}
                            onSavedChange={setSaved}
                        />
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}