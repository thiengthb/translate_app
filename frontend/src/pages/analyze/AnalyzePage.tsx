import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Copy,
  GraduationCap,
  Loader2,
  Volume2,
  X,
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { logger } from "@/lib/logger";
import { translateApi } from "@/api/features/translate.api";

const MAX_CHARS = 5000;

const LANG_VI = "VI";
const LANG_JA = "JA";

const LANG_NAMES: Record<string, string> = {
  VI: "Tiếng Việt",
  JA: "Tiếng Nhật",
};

// ─── Text-to-speech (Web Speech API, like DictionaryPage) ──────────────────
const SPEECH_LANG: Record<string, string> = {
  JA: "ja-JP",
  VI: "vi-VN",
};

function speechLang(code: string): string {
  return SPEECH_LANG[code] ?? SPEECH_LANG[code.split("-")[0]] ?? code.toLowerCase();
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split("-")[0].toLowerCase();
  return (
    voices.find((v) => v.lang === lang) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

function SpeakButton({ text, lang }: { text: string; lang: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!window.speechSynthesis) {
      toast.error("Trình duyệt không hỗ trợ đọc thành tiếng");
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = lang;
    utt.rate = 0.9;
    const voice = pickVoice(lang);
    if (voice) utt.voice = voice;
    utt.onstart = () => setSpeaking(true);
    utt.onend = () => setSpeaking(false);
    utt.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utt);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={speak}
      title="Nghe phát âm"
      className={speaking ? "text-primary" : ""}
    >
      <Volume2 size={16} className={speaking ? "animate-pulse" : ""} />
    </Button>
  );
}

function CopyButton({ text, title = "Sao chép" }: { text: string; title?: string }) {
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép");
    } catch {
      toast.error("Không thể sao chép");
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={onCopy} title={title}>
      <Copy size={16} />
    </Button>
  );
}

/** Colour a JLPT level chip by difficulty. */
function levelBadgeClass(level?: string | null): string {
  switch ((level ?? "").toUpperCase()) {
    case "N5":
    case "N4":
      return "bg-emerald-600 text-white hover:bg-emerald-600";
    case "N3":
      return "bg-amber-500 text-white hover:bg-amber-500";
    case "N2":
    case "N1":
      return "bg-rose-600 text-white hover:bg-rose-600";
    default:
      return "bg-muted text-foreground";
  }
}

export default function AnalyzePage() {
  // ─── Live input state (không tự động trigger API) ─────────────────────────
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<string>(LANG_VI);
  const [targetLang, setTargetLang] = useState<string>(LANG_JA);

  // ─── Submitted state — snapshot tại thời điểm nhấn nút Dịch ─────────────
  const [submittedText, setSubmittedText] = useState("");
  const [submittedSourceLang, setSubmittedSourceLang] = useState<string>(LANG_VI);
  const [submittedTargetLang, setSubmittedTargetLang] = useState<string>(LANG_JA);

  // isJa dựa trên submittedTargetLang (những gì đã thực sự được dịch)
  const isJa = submittedTargetLang.toUpperCase().startsWith("JA");

  // ─── Translation — chỉ chạy khi submittedText thay đổi ──────────────────
  const {
    data: result,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["translate", submittedText, submittedSourceLang, submittedTargetLang],
    queryFn: () =>
      translateApi.translate({
        text: submittedText,
        sourceLang: submittedSourceLang,
        targetLang: submittedTargetLang,
      }),
    enabled: submittedText.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      logger.warn("[translate] request failed");
      toast.error("Dịch thất bại. Vui lòng thử lại.");
    }
  }, [isError]);

  const translatedText = submittedText ? result?.translatedText ?? "" : "";

  // ─── Analysis — 2 query SONG SONG, fire sau khi DeepL trả về ─────────────
  // Tách thành 2 endpoint để cái nhanh hiện trước, không phải đợi cái chậm:
  //   • grammar (romaji + JLPT)  → deterministic, ~vài ms → về TRƯỚC
  //   • alternatives (Ollama LLM) → chậm vài giây        → về SAU
  // Cả hai chỉ chạy sau nhấn nút Dịch (translatedText có giá trị).
  const analyzeParams = {
    text: submittedText,
    translatedText,
    sourceLang: submittedSourceLang,
    targetLang: submittedTargetLang,
  };

  const { data: grammarData, isFetching: grammarLoading } = useQuery({
    queryKey: ["translate-grammar", translatedText, submittedTargetLang],
    queryFn: () => translateApi.analyzeGrammar(analyzeParams),
    enabled: isJa && translatedText.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const { data: altData, isFetching: altLoading } = useQuery({
    queryKey: ["translate-alternatives", translatedText, submittedText, submittedTargetLang],
    queryFn: () => translateApi.analyzeAlternatives(analyzeParams),
    enabled: isJa && translatedText.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const romaji = grammarData?.romaji ?? null;
  const grammar = grammarData?.grammar ?? [];
  const alternatives = altData?.alternatives ?? [];

  const detectedName = useMemo(() => {
    if (!result?.detectedSourceLang) return null;
    return null;
  }, [result]);

  // ─── Nút Dịch ────────────────────────────────────────────────────────────
  const handleTranslate = () => {
    const trimmed = sourceText.trim();
    if (!trimmed) return;
    setSubmittedText(trimmed);
    setSubmittedSourceLang(sourceLang);
    setSubmittedTargetLang(targetLang);
  };

  /** Ctrl+Enter / Cmd+Enter để dịch nhanh */
  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleTranslate();
    }
  };

  // ─── Swap VI ↔ JA ────────────────────────────────────────────────────────
  const onSwap = () => {
    const newSource = targetLang;
    const newTarget = sourceLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setSourceText(translatedText);
    setSubmittedText("");
    setSubmittedSourceLang(newSource);
    setSubmittedTargetLang(newTarget);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <MainLayout pathName={{ "/analyze": "Dịch thuật" }}>
      <div className="w-full flex flex-col gap-4">
        {/* Main translator */}
        <Card className="p-0 overflow-hidden gap-0">
          {/* Language bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <div className="flex-1 text-center font-medium text-sm">
              {LANG_NAMES[sourceLang] ?? sourceLang}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSwap}
              title="Hoán đổi ngôn ngữ"
            >
              <ArrowLeftRight size={18} />
            </Button>

            <div className="flex-1 text-center font-medium text-sm">
              {LANG_NAMES[targetLang] ?? targetLang}
            </div>
          </div>

          {/* Two panes */}
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x">
            {/* Source */}
            <div className="relative flex flex-col">
              <Textarea
                value={sourceText}
                onChange={(e) => setSourceText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={onKeyDown}
                placeholder="Nhập văn bản cần dịch… (Ctrl+Enter để dịch)"
                className="min-h-[240px] resize-none border-0 shadow-none focus-visible:ring-0 text-lg p-4 pr-10"
              />
              {sourceText && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-muted-foreground"
                  onClick={() => setSourceText("")}
                  title="Xóa nội dung"
                >
                  <X size={18} />
                </Button>
              )}
              {/* Char count + nút Dịch */}
              <div className="px-4 py-2 flex items-center justify-between border-t">
                <span className="text-xs text-muted-foreground">
                  {sourceText.length} / {MAX_CHARS}
                </span>
                <Button
                  onClick={handleTranslate}
                  disabled={!sourceText.trim() || isFetching}
                  size="sm"
                >
                  {isFetching && (
                    <Loader2 className="animate-spin mr-1" size={14} />
                  )}
                  Dịch
                </Button>
              </div>

              {/* Grammar Spotter — lấp khoảng trống dưới ô nhập (chỉ khi target là Japanese) */}
              {isJa && translatedText && (
                <div className="flex-1 px-4 py-3 border-t">
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
                        : "Không phát hiện cấu trúc ngữ pháp JLPT nổi bật trong câu này."}
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {grammar.map((g, i) => (
                        <div
                          key={`${g.pattern}-${i}`}
                          className="flex items-start gap-2 rounded-md border p-3"
                        >
                          <span className="text-lg leading-none">📦</span>
                          <div className="flex min-w-0 flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium break-words">{g.pattern}</span>
                              {g.level && (
                                <Badge className={levelBadgeClass(g.level)}>{g.level}</Badge>
                              )}
                              {g.source === "ai" && (
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  AI
                                </Badge>
                              )}
                            </div>
                            {g.meaning && (
                              <p className="text-sm text-muted-foreground break-words">
                                {g.meaning}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target */}
            <div className="relative flex flex-col bg-muted/30">
              <div className="min-h-[240px] p-4 flex flex-col gap-2">
                {translatedText ? (
                  <>
                    <p className="text-lg whitespace-pre-wrap break-words">
                      {translatedText}
                    </p>
                    {isJa && romaji && (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                        {romaji}
                      </p>
                    )}
                  </>
                ) : (
                  <span className="text-lg text-muted-foreground">Bản dịch</span>
                )}
              </div>

              {isFetching && (
                <Loader2
                  className="absolute top-3 right-3 animate-spin text-muted-foreground"
                  size={18}
                />
              )}

              {/* Action row — Speak + Copy */}
              <div className="flex items-center justify-between px-4 py-2 min-h-[44px] border-t">
                <span className="text-xs text-muted-foreground">
                  {detectedName ? `Đã phát hiện: ${detectedName}` : ""}
                </span>
                {translatedText && (
                  <div className="flex items-center">
                    <SpeakButton text={translatedText} lang={speechLang(submittedTargetLang)} />
                    <CopyButton text={translatedText} title="Sao chép bản dịch" />
                  </div>
                )}
              </div>

              {/* Alternatives (hiện sau khi dịch xong, chỉ khi target là Japanese) */}
              {isJa && translatedText && (alternatives.length > 0 || altLoading) && (
                <div className="px-4 py-3 border-t">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    Alternatives:
                    {altLoading && <Loader2 className="animate-spin" size={14} />}
                  </div>
                  <div className="flex flex-col gap-3">
                    {alternatives.map((a, i) => (
                      <div key={i}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-base whitespace-pre-wrap break-words">
                            {a.text}
                          </p>
                          <div className="flex shrink-0">
                            <SpeakButton text={a.text} lang={speechLang(submittedTargetLang)} />
                            <CopyButton text={a.text} />
                          </div>
                        </div>
                        {a.romaji && (
                          <p className="text-xs text-muted-foreground">{a.romaji}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </MainLayout>
  );
}
