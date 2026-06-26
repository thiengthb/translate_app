import { useState } from "react";
import { Repeat, ChevronDown, Volume2, Copy, Check } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FuriganaText } from "@/components/common/FuriganaText";
import { conjugate, type ConjForm } from "./conjugation";

// Nút nghe phát âm (TTS) gọn — dạng chia không có audio Forvo nên chỉ cần
// Web Speech. Tách riêng để không phụ thuộc SpeakButton (tránh import vòng
// với DictionaryPage, vốn import chính component này).
function pickJaVoice(): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    return voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang?.startsWith("ja"));
}

function TtsButton({ text }: { text: string }) {
    const speak = () => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.lang = "ja-JP";
        utt.rate = 0.85;
        const v = pickJaVoice();
        if (v) utt.voice = v;
        window.speechSynthesis.speak(utt);
    };
    return (
        <button
            type="button"
            onClick={speak}
            title="Nghe phát âm"
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
        >
            <Volume2 className="h-3.5 w-3.5" />
        </button>
    );
}

// Một ô dạng chia — kanji + furigana (khi bật & khác kana) + nút nghe/copy khi hover.
function FormCell({ form, furigana }: { form?: ConjForm; furigana: boolean }) {
    const [copied, setCopied] = useState(false);
    if (!form) {
        return <span className="text-sm text-muted-foreground/40 select-none">—</span>;
    }
    const showRuby = furigana && form.kana && form.kana !== form.surface;
    const copy = () => {
        navigator.clipboard.writeText(form.surface);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };
    return (
        <div className="group/cell flex items-center gap-1 min-w-0">
            {showRuby ? (
                <FuriganaText
                    word={form.surface}
                    reading={form.kana}
                    className="text-sm font-semibold text-foreground leading-relaxed truncate"
                />
            ) : (
                <span className="text-sm font-semibold text-foreground truncate">{form.surface}</span>
            )}
            <span className="opacity-0 group-hover/cell:opacity-100 transition-opacity flex items-center shrink-0">
                <TtsButton text={form.kana || form.surface} />
                <button
                    type="button"
                    onClick={copy}
                    title="Copy"
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-colors"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </span>
        </div>
    );
}

/**
 * Bảng chia động từ / tính từ. Tự render section gập/mở (kèm Separator) để
 * cắm một dòng vào WordCard. Ẩn hoàn toàn khi từ không chia được
 * (danh từ, phó từ, mã loại từ thiếu…).
 */
export function ConjugationTable({ word, reading, wordType, furigana }: {
    word: string;
    reading?: string | null;
    wordType?: string | null;
    furigana: boolean;
}) {
    const [open, setOpen] = useState(false);
    const result = conjugate(word, reading, wordType);
    if (!result) return null;

    return (
        <>
            <Separator />
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full px-5 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted/50 flex items-center justify-between transition-colors"
            >
                <span className="flex items-center gap-1.5">
                    <Repeat className="h-3 w-3" />
                    Bảng chia
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                        {result.classLabel}
                    </Badge>
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
                <>
                    <Separator />
                    <div className="bg-muted/30 divide-y">
                        {result.groups.map((g) => (
                            <div key={g.title} className="px-5 py-3">
                                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                    {g.title}
                                </p>
                                <div className="space-y-1">
                                    {/* Header cột */}
                                    <div className="grid grid-cols-[8.5rem_1fr_1fr] gap-2 items-center pb-1">
                                        <span />
                                        <span className="text-[10px] font-medium text-muted-foreground/70">Thường (常体)</span>
                                        <span className="text-[10px] font-medium text-muted-foreground/70">Lịch sự (丁寧)</span>
                                    </div>
                                    {g.rows.map((row) => (
                                        <div key={row.name} className="grid grid-cols-[8.5rem_1fr_1fr] gap-2 items-center">
                                            <span className="text-xs text-muted-foreground leading-tight">{row.name}</span>
                                            <FormCell form={row.plain} furigana={furigana} />
                                            <FormCell form={row.polite} furigana={furigana} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}