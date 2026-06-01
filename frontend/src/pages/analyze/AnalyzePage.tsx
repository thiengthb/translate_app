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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";
import { translateApi, type LanguageOption } from "@/api/features/translate.api";

const AUTO = "auto";
const MAX_CHARS = 5000;

/** Resolve a code in `list`, tolerating DeepL's regional split
 *  (target "EN-US" ↔ source "EN"). */
function findCode(list: LanguageOption[], wanted: string): string | undefined {
  const base = wanted.split("-")[0];
  return (
    list.find((l) => l.code === wanted)?.code ??
    list.find((l) => l.code === base)?.code ??
    list.find((l) => l.code.split("-")[0] === base)?.code
  );
}

// ─── Text-to-speech (Web Speech API, like DictionaryPage) ──────────────────
const SPEECH_LANG: Record<string, string> = {
  JA: "ja-JP",
  EN: "en-US",
  "EN-US": "en-US",
  "EN-GB": "en-GB",
  VI: "vi-VN",
  ZH: "zh-CN",
  KO: "ko-KR",
  FR: "fr-FR",
  DE: "de-DE",
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
  const [sourceLang, setSourceLang] = useState<string>(AUTO);
  const [targetLang, setTargetLang] = useState<string>("");

  // ─── Submitted state — snapshot tại thời điểm nhấn nút Dịch ─────────────
  // Chỉ khi submitted* thay đổi thì API mới được gọi
  const [submittedText, setSubmittedText] = useState("");
  const [submittedSourceLang, setSubmittedSourceLang] = useState<string>(AUTO);
  const [submittedTargetLang, setSubmittedTargetLang] = useState<string>("");

  // ─── Supported-language lists (straight from DeepL) ─────────────────────
  const { data: sourceLanguages = [] } = useQuery({
    queryKey: ["translate-languages", "source"],
    queryFn: () => translateApi.getLanguages("source"),
    staleTime: Infinity,
  });
  const { data: targetLanguages = [] } = useQuery({
    queryKey: ["translate-languages", "target"],
    queryFn: () => translateApi.getLanguages("target"),
    staleTime: Infinity,
  });

  // Default the target to Japanese — the page is tuned for VI/EN → JA (romaji +
  // JLPT Grammar Spotter). Fall back to the first language if JA is missing.
  useEffect(() => {
    if (!targetLang && targetLanguages.length > 0) {
      const preferred =
        targetLanguages.find((l) => l.code.toUpperCase().startsWith("JA")) ??
        targetLanguages[0];
      setTargetLang(preferred.code);
    }
  }, [targetLanguages, targetLang]);

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
        sourceLang: submittedSourceLang === AUTO ? undefined : submittedSourceLang,
        targetLang: submittedTargetLang,
      }),
    enabled: submittedText.length > 0 && Boolean(submittedTargetLang),
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

  // ─── Analysis (romaji + alternatives + Grammar Spotter) ──────────────────
  // Tự động fire SAU KHI DeepL trả về kết quả (translatedText có giá trị).
  // Không bao giờ chạy khi user chỉ đang gõ — chỉ chạy sau nhấn nút Dịch.
  const { data: analysis, isFetching: analyzing } = useQuery({
    queryKey: ["translate-analyze", translatedText, submittedText, submittedTargetLang],
    queryFn: () =>
      translateApi.analyze({
        text: submittedText,
        translatedText,
        sourceLang: submittedSourceLang === AUTO ? undefined : submittedSourceLang,
        targetLang: submittedTargetLang,
      }),
    enabled: isJa && translatedText.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const romaji = analysis?.romaji ?? null;
  const alternatives = analysis?.alternatives ?? [];
  const grammar = analysis?.grammar ?? [];

  const detectedName = useMemo(() => {
    if (submittedSourceLang !== AUTO || !result?.detectedSourceLang) return null;
    const code = result.detectedSourceLang;
    return sourceLanguages.find((l) => l.code === code)?.name ?? code;
  }, [submittedSourceLang, result, sourceLanguages]);

  // ─── Nút Dịch ────────────────────────────────────────────────────────────
  const handleTranslate = () => {
    const trimmed = sourceText.trim();
    if (!trimmed || !targetLang) return;
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

  // ─── Swap ─────────────────────────────────────────────────────────────────
  const canSwap = sourceLang !== AUTO;

  const onSwap = () => {
    if (!canSwap) return;
    const newSource = findCode(sourceLanguages, targetLang) ?? sourceLang;
    const newTarget = findCode(targetLanguages, sourceLang) ?? targetLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setSourceText(translatedText);
    // Reset submitted state — user phải nhấn Dịch lại với văn bản mới
    setSubmittedText("");
    setSubmittedSourceLang(AUTO);
    setSubmittedTargetLang("");
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <MainLayout pathName={{ "/analyze": "Dịch thuật" }}>
      <div className="w-full flex flex-col gap-4">
        {/* Main translator */}
        <Card className="p-0 overflow-hidden gap-0">
          {/* Language bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger className="flex-1 border-0 shadow-none font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={AUTO}>Detect language</SelectItem>
                {sourceLanguages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={onSwap}
              disabled={!canSwap}
              title={
                canSwap ? "Hoán đổi ngôn ngữ" : "Chọn ngôn ngữ nguồn để hoán đổi"
              }
            >
              <ArrowLeftRight size={18} />
            </Button>

            <Select value={targetLang} onValueChange={setTargetLang}>
              <SelectTrigger className="flex-1 border-0 shadow-none font-medium">
                <SelectValue placeholder="Ngôn ngữ đích" />
              </SelectTrigger>
              <SelectContent>
                {targetLanguages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  disabled={!sourceText.trim() || !targetLang || isFetching}
                  size="sm"
                >
                  {isFetching && (
                    <Loader2 className="animate-spin mr-1" size={14} />
                  )}
                  Dịch
                </Button>
              </div>
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
              {isJa && translatedText && (alternatives.length > 0 || analyzing) && (
                <div className="px-4 py-3 border-t">
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    Alternatives:
                    {analyzing && <Loader2 className="animate-spin" size={14} />}
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

        {/* Grammar Spotter — JLPT pattern analysis of the Japanese sentence */}
        {isJa && translatedText && (
          <Card className="p-4 gap-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <GraduationCap size={18} />
              Phân tích ngữ pháp (JLPT)
              {analyzing && (
                <Loader2 className="animate-spin text-muted-foreground" size={14} />
              )}
            </div>

            {grammar.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {analyzing
                  ? "Đang phân tích…"
                  : "Không phát hiện cấu trúc ngữ pháp JLPT nổi bật trong câu này."}
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
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
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
