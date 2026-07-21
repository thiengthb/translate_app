import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowLeftRight, GraduationCap, Loader2, X } from "lucide-react";

import { translateApi } from "@/api/features/translate.api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { CopyButton, LevelBadge, SpeakButton } from "../guest-ui";

// Guest: giới hạn ngắn hơn trang dịch đầy đủ (5000) để hạn chế lạm dụng DeepL.
const MAX_CHARS = 1000;

const LANG_NAMES: Record<string, string> = { VI: "Tiếng Việt", JA: "Tiếng Nhật" };
const SPEECH_LANG: Record<string, string> = { JA: "ja-JP", VI: "vi-VN" };

export function TranslatePanel() {
    const [sourceText, setSourceText] = useState("");
    const [sourceLang, setSourceLang] = useState("VI");
    const [targetLang, setTargetLang] = useState("JA");

    // Snapshot khi nhấn Dịch.
    const [submitted, setSubmitted] = useState<{
        text: string;
        source: string;
        target: string;
    } | null>(null);

    const isJa = (submitted?.target ?? "").toUpperCase().startsWith("JA");

    const { data, isFetching, isError } = useQuery({
        queryKey: ["guest-translate", submitted?.text, submitted?.source, submitted?.target],
        queryFn: () =>
            translateApi.translate({
                text: submitted!.text,
                sourceLang: submitted!.source,
                targetLang: submitted!.target,
            }),
        enabled: !!submitted?.text,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const translatedText = submitted ? data?.translatedText ?? "" : "";

    // Ngữ pháp + romaji (deterministic, rẻ) — chỉ khi dịch sang tiếng Nhật.
    const { data: grammarData, isFetching: grammarLoading } = useQuery({
        queryKey: ["guest-translate-grammar", translatedText, submitted?.target],
        queryFn: () =>
            translateApi.analyzeGrammar({
                text: submitted!.text,
                translatedText,
                sourceLang: submitted!.source,
                targetLang: submitted!.target,
            }),
        enabled: isJa && translatedText.length > 0,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const romaji = grammarData?.romaji ?? null;
    const grammar = grammarData?.grammar ?? [];

    const handleTranslate = () => {
        const trimmed = sourceText.trim();
        if (!trimmed) return;
        setSubmitted({ text: trimmed, source: sourceLang, target: targetLang });
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            handleTranslate();
        }
    };

    const onSwap = () => {
        const nextSource = targetLang;
        const nextTarget = sourceLang;
        setSourceLang(nextSource);
        setTargetLang(nextTarget);
        setSourceText(translatedText);
        setSubmitted(null);
    };

    return (
        <div className="flex flex-col gap-4">
            <Card className="p-0 overflow-hidden gap-0">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <div className="flex-1 text-center text-sm font-medium">
                        {LANG_NAMES[sourceLang] ?? sourceLang}
                    </div>
                    <Button variant="ghost" size="icon" onClick={onSwap} title="Hoán đổi ngôn ngữ">
                        <ArrowLeftRight size={18} />
                    </Button>
                    <div className="flex-1 text-center text-sm font-medium">
                        {LANG_NAMES[targetLang] ?? targetLang}
                    </div>
                </div>

                <div className="grid divide-y md:grid-cols-2 md:divide-x md:divide-y-0">
                    {/* Nguồn */}
                    <div className="relative flex flex-col">
                        <Textarea
                            value={sourceText}
                            onChange={(e) => setSourceText(e.target.value.slice(0, MAX_CHARS))}
                            onKeyDown={onKeyDown}
                            placeholder="Nhập văn bản cần dịch… (Ctrl+Enter để dịch)"
                            className="min-h-[180px] resize-none border-0 p-4 pr-10 text-lg shadow-none focus-visible:ring-0"
                        />
                        {sourceText && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2 text-muted-foreground"
                                onClick={() => setSourceText("")}
                                title="Xóa nội dung"
                            >
                                <X size={18} />
                            </Button>
                        )}
                        <div className="flex items-center justify-between border-t px-4 py-2">
                            <span className="text-xs text-muted-foreground">
                                {sourceText.length} / {MAX_CHARS}
                            </span>
                            <Button
                                onClick={handleTranslate}
                                disabled={!sourceText.trim() || isFetching}
                                size="sm"
                            >
                                {isFetching && <Loader2 className="mr-1 animate-spin" size={14} />}
                                Dịch
                            </Button>
                        </div>
                    </div>

                    {/* Đích */}
                    <div className="relative flex flex-col bg-muted/30">
                        <div className="flex min-h-[180px] flex-col gap-2 p-4">
                            {translatedText ? (
                                <>
                                    <p className="whitespace-pre-wrap break-words text-lg">
                                        {translatedText}
                                    </p>
                                    {isJa && romaji && (
                                        <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                                            {romaji}
                                        </p>
                                    )}
                                </>
                            ) : (
                                <span className="text-lg text-muted-foreground">
                                    {isError ? "Dịch thất bại. Vui lòng thử lại." : "Bản dịch"}
                                </span>
                            )}
                        </div>
                        {isFetching && (
                            <Loader2
                                className="absolute right-3 top-3 animate-spin text-muted-foreground"
                                size={18}
                            />
                        )}
                        {translatedText && (
                            <div className="flex items-center justify-end border-t px-4 py-2">
                                <SpeakButton
                                    text={translatedText}
                                    lang={SPEECH_LANG[submitted!.target] ?? "ja-JP"}
                                />
                                <CopyButton text={translatedText} title="Sao chép bản dịch" />
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Ngữ pháp JLPT */}
            {isJa && translatedText && (
                <Card className="p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                        <GraduationCap size={18} />
                        Phân tích ngữ pháp (JLPT)
                        {grammarLoading && (
                            <Loader2 className="animate-spin text-muted-foreground" size={14} />
                        )}
                    </div>
                    {grammar.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            {grammarLoading
                                ? "Đang phân tích…"
                                : "Không phát hiện cấu trúc ngữ pháp JLPT nổi bật."}
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            {grammar.map((g, i) => (
                                <div
                                    key={`${g.pattern}-${i}`}
                                    className="flex items-start gap-2 rounded-md border p-3"
                                >
                                    <span className="leading-none">📦</span>
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="break-words font-medium">
                                                {g.pattern}
                                            </span>
                                            <LevelBadge level={g.level} />
                                        </div>
                                        {g.meaning && (
                                            <p className="break-words text-sm text-muted-foreground">
                                                {g.meaning}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            )}

            <p className="text-center text-xs text-muted-foreground">
                Dịch tối đa {MAX_CHARS} ký tự.{" "}
                <Link to="/login" className="text-primary underline-offset-2 hover:underline">
                    Đăng nhập
                </Link>{" "}
                để dịch văn bản dài hơn và xem các cách dịch thay thế.
            </p>
        </div>
    );
}
