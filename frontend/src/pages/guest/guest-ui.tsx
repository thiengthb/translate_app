import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Bookmark, Copy, Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Debounce (dùng cho ô tra cứu, tránh gọi API mỗi phím) ─────────────────
export function useDebounced<T>(value: T, delayMs = 350): T {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = window.setTimeout(() => setDebounced(value), delayMs);
        return () => window.clearTimeout(id);
    }, [value, delayMs]);
    return debounced;
}

// ─── Web Speech phát âm (giống DictionaryPage / AnalyzePage) ────────────────
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

export function SpeakButton({
    text,
    lang = "ja-JP",
    className,
}: {
    text: string;
    lang?: string;
    className?: string;
}) {
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
            className={cn(speaking && "text-primary", className)}
        >
            <Volume2 size={16} className={speaking ? "animate-pulse" : ""} />
        </Button>
    );
}

export function CopyButton({ text, title = "Sao chép" }: { text: string; title?: string }) {
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

/** Tô màu chip JLPT theo độ khó. */
export function levelBadgeClass(level?: string | null): string {
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

export function LevelBadge({ level }: { level?: string | null }) {
    if (!level) return null;
    return <Badge className={levelBadgeClass(level)}>{level}</Badge>;
}

/**
 * Guest không có sổ tay (per-user, cần đăng nhập). Nút này chỉ mời đăng nhập
 * — bấm sẽ điều hướng tới /login, không gọi notebook API.
 */
export function LoginToSaveButton({ className }: { className?: string }) {
    return (
        <Button
            asChild
            variant="outline"
            size="sm"
            className={cn("gap-1.5", className)}
            title="Đăng nhập để lưu vào sổ tay"
        >
            <Link to="/login">
                <Bookmark size={14} />
                Lưu
            </Link>
        </Button>
    );
}
