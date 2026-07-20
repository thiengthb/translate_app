import { useState, useEffect, useRef, useCallback } from "react";

interface StrokeData { id: string; d: string; }

const SPEEDS = [
    { label: "Chậm", ms: 1200 },
    { label: "Vừa",  ms: 700  },
    { label: "Nhanh", ms: 280 },
];

function toHex5(char: string) {
    return char.codePointAt(0)!.toString(16).padStart(5, "0");
}

// ── Single animated stroke path ───────────────────────────────────────
function StrokePath({ d, state, ms }: {
    d: string;
    state: "hidden" | "animating" | "shown";
    ms: number;
}) {
    const ref = useRef<SVGPathElement>(null);
    const [len, setLen] = useState<number | null>(null);

    useEffect(() => {
        if (ref.current) setLen(ref.current.getTotalLength());
    }, [d]);

    return (
        <path
            ref={ref}
            d={d}
            fill="none"
            stroke={state === "animating" ? "#3b82f6" : "currentColor"}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={
                len != null
                    ? {
                          strokeDasharray: len,
                          strokeDashoffset: state === "hidden" ? len : 0,
                          transition:
                              state === "animating"
                                  ? `stroke-dashoffset ${ms}ms ease-in-out`
                                  : "stroke 400ms ease",
                      }
                    : { opacity: 0 }
            }
        />
    );
}

// ── Control button helper ─────────────────────────────────────────────
function CtrlBtn({ onClick, disabled, title, children }: {
    onClick: () => void; disabled?: boolean; title: string; children: React.ReactNode;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
        >
            {children}
        </button>
    );
}

// ── Main component ────────────────────────────────────────────────────
export function KanjiStrokeOrder({ character }: { character: string }) {
    const [strokes,  setStrokes]  = useState<StrokeData[]>([]);
    const [phase,    setPhase]    = useState<"idle" | "loading" | "ok" | "error">("idle");
    const [drawn,    setDrawn]    = useState(0);   // 0 = nothing, N = N strokes drawn
    const [playing,  setPlaying]  = useState(false);
    const [speedIdx, setSpeedIdx] = useState(1);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const ms = SPEEDS[speedIdx].ms;

    // Fetch KanjiVG SVG
    useEffect(() => {
        if (!character) return;
        let cancelled = false;
        setPhase("loading");
        setStrokes([]);
        setDrawn(0);
        setPlaying(false);
        if (timer.current) clearTimeout(timer.current);

        fetch(`https://cdn.jsdelivr.net/gh/KanjiVG/kanjivg@master/kanji/${toHex5(character)}.svg`)
            .then(r => { if (!r.ok) throw 0; return r.text(); })
            .then(xml => {
                if (cancelled) return;
                const doc = new DOMParser().parseFromString(xml, "image/svg+xml");
                const paths = Array.from(doc.querySelectorAll("path"))
                    .filter(p => /-s\d+$/.test(p.getAttribute("id") ?? ""))
                    .map(p => ({ id: p.getAttribute("id")!, d: p.getAttribute("d")! }));
                setStrokes(paths);
                setPhase(paths.length ? "ok" : "error");
            })
            .catch(() => { if (!cancelled) setPhase("error"); });

        return () => {
            cancelled = true;
            if (timer.current) clearTimeout(timer.current);
        };
    }, [character]);

    // Auto-advance strokes
    useEffect(() => {
        if (!playing) return;
        if (drawn >= strokes.length) { setPlaying(false); return; }
        timer.current = setTimeout(() => setDrawn(d => d + 1), ms + 120);
        return () => {
            if (timer.current) clearTimeout(timer.current);
        };
    }, [playing, drawn, strokes.length, ms]);

    const play  = useCallback(() => { if (drawn >= strokes.length) setDrawn(0); setPlaying(true);  }, [drawn, strokes.length]);
    const pause = () => setPlaying(false);
    const reset = () => { setPlaying(false); setDrawn(0); };
    const prev  = () => { setPlaying(false); setDrawn(d => Math.max(d - 1, 0)); };
    const next  = () => { setPlaying(false); setDrawn(d => Math.min(d + 1, strokes.length)); };

    if (phase === "loading") return (
        <div className="flex justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
        </div>
    );

    if (phase === "error") return (
        <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-5">
            Không có dữ liệu stroke order cho kanji này.
        </p>
    );

    if (phase !== "ok") return null;

    return (
        <div className="flex flex-col items-center gap-3 py-3">

            {/* ── Canvas ── */}
            <div className="relative">
                <svg
                    viewBox="0 0 109 109"
                    width={190}
                    height={190}
                    className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                >
                    {/* Guide grid */}
                    <rect x={2} y={2} width={105} height={105} rx={3}
                        fill="none" stroke="#e5e7eb" strokeWidth={0.5} />
                    <line x1={54.5} y1={3} x2={54.5} y2={106}
                        stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="4,3" />
                    <line x1={3} y1={54.5} x2={106} y2={54.5}
                        stroke="#e5e7eb" strokeWidth={0.5} strokeDasharray="4,3" />

                    {/* Stroke paths */}
                    {strokes.map((s, i) => (
                        <StrokePath
                            key={s.id}
                            d={s.d}
                            ms={ms}
                            state={
                                i < drawn - 1  ? "shown"     :
                                i === drawn - 1 ? "animating" :
                                "hidden"
                            }
                        />
                    ))}
                </svg>

                {/* Stroke counter */}
                <span className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-bold rounded-md px-1.5 py-0.5 tabular-nums backdrop-blur-sm select-none">
                    {drawn}/{strokes.length}
                </span>
            </div>

            {/* ── Progress dots ── */}
            <div className="flex gap-1.5 flex-wrap justify-center" style={{ maxWidth: 210 }}>
                {strokes.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { setPlaying(false); setDrawn(i + 1); }}
                        title={`Nét ${i + 1}`}
                        className={`h-2 w-2 rounded-full transition-all duration-200 ${
                            i < drawn
                                ? "bg-blue-500 scale-110"
                                : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        }`}
                    />
                ))}
            </div>

            {/* ── Playback controls ── */}
            <div className="flex items-center gap-2">
                <CtrlBtn onClick={prev} disabled={drawn === 0} title="Nét trước">
                    <PrevIcon />
                </CtrlBtn>
                <CtrlBtn onClick={reset} title="Đặt lại">
                    <ResetIcon />
                </CtrlBtn>
                <button
                    onClick={playing ? pause : play}
                    className="h-9 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 active:scale-95 text-white text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm select-none"
                >
                    {playing         ? <><PauseIcon /> Dừng</>  :
                     drawn >= strokes.length ? <><ReplayIcon /> Lại</>  :
                     drawn === 0     ? <><PlayIcon />  Xem</>  :
                                      <><PlayIcon />  Tiếp</>}
                </button>
                <CtrlBtn onClick={next} disabled={drawn >= strokes.length} title="Nét sau">
                    <NextIcon />
                </CtrlBtn>
            </div>

            {/* ── Speed selector ── */}
            <div className="flex gap-1 text-[11px]">
                {SPEEDS.map((s, i) => (
                    <button
                        key={s.label}
                        onClick={() => setSpeedIdx(i)}
                        className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                            speedIdx === i
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400"
                                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                    >
                        {s.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

// ── Icons ─────────────────────────────────────────────────────────────
function PlayIcon() {
    return <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
}
function PauseIcon() {
    return <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
}
function ReplayIcon() {
    return <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" /></svg>;
}
function ResetIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    );
}
function PrevIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
        </svg>
    );
}
function NextIcon() {
    return (
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
        </svg>
    );
}
