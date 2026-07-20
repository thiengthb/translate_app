import { useEffect, useRef, useState } from "react";
import { Play, Pause, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

// Tách theo dấu kết câu để đọc thành nhiều utterance ngắn — vừa giúp "Dừng"
// cắt được ngay, vừa tránh giới hạn độ dài utterance của một số trình duyệt.
function splitForSpeech(text: string): string[] {
    return text
        .split(/(?<=[。！？!?\n])/)
        .map((s) => s.trim())
        .filter(Boolean);
}

/**
 * Nút "Đọc cả bài" dùng Web Speech API (ja-JP). Phát/tạm dừng/tiếp tục/dừng.
 * Tự huỷ khi đổi bài hoặc rời trang. Ẩn nếu trình duyệt không hỗ trợ TTS.
 */
export function PassagePlayer({ text }: { text: string }) {
    const [playing, setPlaying] = useState(false);
    const [paused, setPaused] = useState(false);
    const stoppedRef = useRef(false);

    const supported = typeof window !== "undefined" && !!window.speechSynthesis;

    // Huỷ phát khi nội dung đổi (chuyển bài) hoặc unmount.
    useEffect(() => {
        return () => { window.speechSynthesis?.cancel(); };
    }, [text]);

    const start = () => {
        if (!supported) return;
        window.speechSynthesis.cancel();
        stoppedRef.current = false;
        const chunks = splitForSpeech(text);
        const jaVoice = window.speechSynthesis.getVoices().find((v) => v.lang?.startsWith("ja"));
        chunks.forEach((chunk, i) => {
            const u = new SpeechSynthesisUtterance(chunk);
            u.lang = "ja-JP";
            u.rate = 0.9;
            if (jaVoice) u.voice = jaVoice;
            if (i === chunks.length - 1) {
                u.onend = () => { if (!stoppedRef.current) { setPlaying(false); setPaused(false); } };
            }
            window.speechSynthesis.speak(u);
        });
        setPlaying(true);
        setPaused(false);
    };

    const stop = () => {
        stoppedRef.current = true;
        window.speechSynthesis?.cancel();
        setPlaying(false);
        setPaused(false);
    };

    const toggle = () => {
        if (!playing) { start(); return; }
        if (paused) { window.speechSynthesis.resume(); setPaused(false); }
        else { window.speechSynthesis.pause(); setPaused(true); }
    };

    if (!supported) return null;

    return (
        <div className="inline-flex items-center gap-1">
            <Button onClick={toggle} variant={playing ? "secondary" : "default"} size="sm" className="gap-1.5">
                {playing && !paused ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? (paused ? "Tiếp tục" : "Tạm dừng") : "Đọc cả bài"}
            </Button>
            {playing && (
                <Button onClick={stop} variant="ghost" size="icon-sm" title="Dừng đọc">
                    <Square className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}