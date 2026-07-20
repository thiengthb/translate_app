import { useState, useRef, useCallback, useEffect } from "react";

type RecognitionState = "idle" | "listening" | "error";

type SpeechRecognitionErrorEventLike = { error: string };
type SpeechRecognitionResultEventLike = {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

interface SpeechRecognitionLike {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    continuous: boolean;
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
    onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
    abort: () => void;
    stop: () => void;
    start: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }
}

const SpeechRecognitionCtor: SpeechRecognitionConstructor | undefined =
    typeof window !== "undefined"
        ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
        : undefined;

export function VoiceInput({ onSelect }: { onSelect: (text: string) => void }) {
    const [state, setState]     = useState<RecognitionState>("idle");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const recRef = useRef<SpeechRecognitionLike | null>(null);
    const errTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Đặt lịch tự ẩn thông báo lỗi; clear lịch cũ để tránh setState sau unmount.
    const scheduleReset = useCallback(() => {
        if (errTimer.current) clearTimeout(errTimer.current);
        errTimer.current = setTimeout(() => { setState("idle"); setErrorMsg(null); }, 3000);
    }, []);

    useEffect(() => () => {
        recRef.current?.abort();
        if (errTimer.current) clearTimeout(errTimer.current);
    }, []);

    const stop = useCallback(() => {
        recRef.current?.stop();
        setState("idle");
    }, []);

    const start = useCallback(() => {
        if (!SpeechRecognitionCtor) {
            setErrorMsg("Trình duyệt không hỗ trợ nhận diện giọng nói");
            setState("error");
            scheduleReset();
            return;
        }

        // Hủy phiên trước (nếu có) trước khi tạo phiên mới → không bỏ rơi instance cũ.
        recRef.current?.abort();

        const rec = new SpeechRecognitionCtor();
        rec.lang = "ja-JP";
        rec.interimResults = false;
        rec.maxAlternatives = 1;
        rec.continuous = false;

        rec.onstart  = () => { setState("listening"); setErrorMsg(null); };
        rec.onend    = () => setState((s) => s === "listening" ? "idle" : s);
        rec.onerror  = (e) => {
            setState("error");
            const msgs: Record<string, string> = {
                "no-speech":   "Không nghe thấy giọng nói — thử lại",
                "not-allowed": "Chưa cấp quyền microphone",
                "network":     "Lỗi mạng, kiểm tra kết nối",
            };
            setErrorMsg(msgs[e.error] ?? "Nhận diện thất bại");
            scheduleReset();
        };
        rec.onresult = (e) => {
            const text = e.results[0][0].transcript.trim();
            setState("idle");
            if (text) onSelect(text);
        };

        recRef.current = rec;
        rec.start();
    }, [onSelect, scheduleReset]);

    if (!SpeechRecognitionCtor) return null;

    const listening = state === "listening";

    return (
        <div className="relative">
            <button
                type="button"
                onClick={listening ? stop : start}
                title={listening ? "Dừng ghi âm" : "Tìm kiếm bằng giọng nói (tiếng Nhật)"}
                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                    listening
                        ? "bg-red-500 text-white shadow-md"
                        : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-950/40"
                }`}
            >
                {listening ? (
                    <span className="relative flex items-center justify-center w-5 h-5">
                        <span className="animate-ping absolute inset-0 rounded-full bg-red-300 opacity-75" />
                        <MicIcon className="h-5 w-5 relative" />
                    </span>
                ) : (
                    <MicIcon className="h-5 w-5" />
                )}
            </button>

            {errorMsg && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap bg-gray-900 text-white text-xs px-3 py-1.5 rounded-lg shadow-lg pointer-events-none">
                    {errorMsg}
                </div>
            )}
        </div>
    );
}

function MicIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4M12 3a3 3 0 00-3 3v5a3 3 0 006 0V6a3 3 0 00-3-3z" />
        </svg>
    );
}
