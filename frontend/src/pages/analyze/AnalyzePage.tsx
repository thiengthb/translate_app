import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Copy,
  Loader2,
  X,
  Sparkles,

} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { logger } from "@/lib/logger";
import {
  translateApi,
  type Formality,
  type LanguageOption,
} from "@/api/features/translate.api";

const AUTO = "auto";
const MAX_CHARS = 5000;
const DEBOUNCE_MS = 600;

/** Editing-tool rows that require DeepL Pro (no Free-API equivalent) — shown
 *  disabled, mirroring deepl.com. */


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

export default function AnalyzePage() {
  const [sourceText, setSourceText] = useState("");
  const [sourceLang, setSourceLang] = useState<string>(AUTO);
  const [targetLang, setTargetLang] = useState<string>("");
  const [formality, setFormality] = useState<Formality>("default");

  const debouncedText = useDebouncedValue(sourceText, DEBOUNCE_MS);

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

  // Pick a sensible default target once the list arrives (DeepL has no Vietnamese,
  // so the mockup's JA→VI isn't possible — default to English).
  useEffect(() => {
    if (!targetLang && targetLanguages.length > 0) {
      const preferred =
        targetLanguages.find((l) => l.code === "EN-US") ?? targetLanguages[0];
      setTargetLang(preferred.code);
    }
  }, [targetLanguages, targetLang]);

  const targetMeta = useMemo(
    () => targetLanguages.find((l) => l.code === targetLang),
    [targetLanguages, targetLang],
  );
  const supportsFormality = Boolean(targetMeta?.supportsFormality);

  // ─── Translation ─────────────────────────────────────────────────────────
  const trimmed = debouncedText.trim();
  const {
    data: result,
    isFetching,
    isError,
  } = useQuery({
    queryKey: ["translate", trimmed, sourceLang, targetLang, formality],
    queryFn: () =>
      translateApi.translate({
        text: trimmed,
        sourceLang: sourceLang === AUTO ? undefined : sourceLang,
        targetLang,
        formality: supportsFormality ? formality : undefined,
      }),
    enabled: trimmed.length > 0 && Boolean(targetLang),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      logger.warn("[translate] request failed");
      toast.error("Dịch thất bại. Vui lòng thử lại.");
    }
  }, [isError]);

  const translatedText = sourceText.trim() ? result?.translatedText ?? "" : "";
  const detectedName = useMemo(() => {
    if (sourceLang !== AUTO || !result?.detectedSourceLang) return null;
    const code = result.detectedSourceLang;
    return sourceLanguages.find((l) => l.code === code)?.name ?? code;
  }, [sourceLang, result, sourceLanguages]);

  // ─── Actions ───────────────────────────────────────────────────────────
  const canSwap = sourceLang !== AUTO;

  const onSwap = () => {
    if (!canSwap) return;
    const newSource = findCode(sourceLanguages, targetLang) ?? sourceLang;
    const newTarget = findCode(targetLanguages, sourceLang) ?? targetLang;
    setSourceLang(newSource);
    setTargetLang(newTarget);
    setSourceText(translatedText);
  };

  const onCopy = async () => {
    if (!translatedText) return;
    try {
      await navigator.clipboard.writeText(translatedText);
      toast.success("Đã sao chép bản dịch");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <MainLayout pathName={{ "/analyze": "Dịch thuật" }}>
      <div className="w-full flex flex-col gap-4 lg:flex-row">
        {/* Main translator */}
        <Card className="flex-1 p-0 overflow-hidden gap-0">
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
                onChange={(e) =>
                  setSourceText(e.target.value.slice(0, MAX_CHARS))
                }
                placeholder="Nhập văn bản cần dịch…"
                className="min-h-[280px] resize-none border-0 shadow-none focus-visible:ring-0 text-lg p-4 pr-10"
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
              <div className="px-4 py-2 text-xs text-muted-foreground text-right">
                {sourceText.length} / {MAX_CHARS}
              </div>
            </div>

            {/* Target */}
            <div className="relative flex flex-col bg-muted/30">
              <div className="min-h-[280px] p-4 text-lg whitespace-pre-wrap break-words">
                {translatedText ? (
                  <span>{translatedText}</span>
                ) : (
                  <span className="text-muted-foreground">Bản dịch</span>
                )}
              </div>
              {isFetching && (
                <Loader2
                  className="absolute top-3 right-3 animate-spin text-muted-foreground"
                  size={18}
                />
              )}
              <div className="flex items-center justify-between px-4 py-2 min-h-[36px]">
                <span className="text-xs text-muted-foreground">
                  {detectedName ? `Đã phát hiện: ${detectedName}` : ""}
                </span>
                {translatedText && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onCopy}
                    title="Sao chép"
                  >
                    <Copy size={16} />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Editing tools */}
        <Card className="lg:w-72 p-4 gap-4 h-fit">
          <div className="text-sm font-medium text-muted-foreground">
            Editing tools
          </div>

          {/* Formality — the one tool the Free API supports */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles size={16} />
              Formality
            </div>
            {supportsFormality ? (
              <div className="grid grid-cols-3 gap-1">
                {(
                  [
                    ["default", "Mặc định"],
                    ["prefer_more", "Trang trọng"],
                    ["prefer_less", "Thân mật"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={formality === value ? "default" : "outline"}
                    onClick={() => setFormality(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ngôn ngữ đích này không hỗ trợ tùy chỉnh mức độ trang trọng.
              </p>
            )}
          </div>

          <Separator />

          {/* Pro-only tools — visual parity with deepl.com */}

        </Card>
      </div>
    </MainLayout>
  );
}
