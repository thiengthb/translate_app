import { useRef, useState, useEffect, useLayoutEffect } from "react";
import { dictionaryApi } from "@/api/features/dictionary.api";

type Stroke = [number[], number[]]; // [[x coords], [y coords]]

const CANVAS_W = 272;
const CANVAS_H = 272;

export function HandwritingInput({ onSelect }: { onSelect: (char: string) => void }) {
    const [isOpen,      setIsOpen]      = useState(false);
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [recognizing, setRecognizing] = useState(false);
    const [strokeCount, setStrokeCount] = useState(0);
    const [errorMsg,    setErrorMsg]    = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef    = useRef<HTMLCanvasElement>(null);
    const isDrawing    = useRef(false);
    const strokesRef   = useRef<Stroke[]>([]);
    const currentXs    = useRef<number[]>([]);
    const currentYs    = useRef<number[]>([]);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node))
                setIsOpen(false);
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const h = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
        document.addEventListener("keydown", h);
        return () => document.removeEventListener("keydown", h);
    }, [isOpen]);

    // Reset everything when panel opens
    useEffect(() => {
        if (isOpen) {
            const id = setTimeout(() => {
                strokesRef.current = [];
                currentXs.current = [];
                currentYs.current = [];
                setStrokeCount(0);
                setSuggestions([]);
                setErrorMsg(null);
                drawGuides();
            }, 10);
            return () => clearTimeout(id);
        }
    }, [isOpen]);

    // Set canvas bitmap size ONCE when canvas mounts. Setting canvas.width /
    // canvas.height ALWAYS clears the bitmap — so we must avoid letting React's
    // reconciler re-apply these attributes on every render (which is exactly
    // what was wiping previous strokes when state updated).
    useLayoutEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (canvas.width  !== CANVAS_W) canvas.width  = CANVAS_W;
        if (canvas.height !== CANVAS_H) canvas.height = CANVAS_H;
    }, [isOpen]);

    // Canvas safety net: after every render, sync canvas with stroke data
    // (skip while a stroke is in progress, so we don't wipe the live segment).
    useLayoutEffect(() => {
        if (isOpen && !isDrawing.current) {
            redrawAll(strokesRef.current);
        }
    });

    const isDark = () => document.documentElement.classList.contains("dark");

    const drawGuides = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = isDark() ? "#111827" : "#ffffff";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        // Outer box
        ctx.strokeStyle = isDark() ? "#374151" : "#e5e7eb";
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.strokeRect(0.5, 0.5, CANVAS_W - 1, CANVAS_H - 1);
        // Cross dashed guide
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, 0);
        ctx.lineTo(CANVAS_W / 2, CANVAS_H);
        ctx.moveTo(0, CANVAS_H / 2);
        ctx.lineTo(CANVAS_W, CANVAS_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    };

    const redrawAll = (strokes: Stroke[]) => {
        drawGuides();
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = isDark() ? "#f9fafb" : "#111827";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        strokes.forEach(([xs, ys]) => {
            if (xs.length < 2) return;
            ctx.beginPath();
            ctx.moveTo(xs[0], ys[0]);
            for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
            ctx.stroke();
        });
    };

    const getXY = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const src = "touches" in e ? e.touches[0] : e;
        return {
            x: ((src.clientX - rect.left) / rect.width)  * CANVAS_W,
            y: ((src.clientY - rect.top)  / rect.height) * CANVAS_H,
        };
    };

    const startStroke = (x: number, y: number) => {
        setErrorMsg(null);
        // Defensive: ensure previous strokes are visible before starting a new one.
        // The canvas bitmap can be cleared by React re-renders / theme switches /
        // touch+mouse double-fire on some devices — redraw from data each time.
        redrawAll(strokesRef.current);
        isDrawing.current = true;
        currentXs.current = [Math.round(x)];
        currentYs.current = [Math.round(y)];
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        ctx.strokeStyle = isDark() ? "#f9fafb" : "#111827";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const continueStroke = (x: number, y: number) => {
        if (!isDrawing.current) return;
        currentXs.current.push(Math.round(x));
        currentYs.current.push(Math.round(y));
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx) return;
        // Defensive full redraw: guides + all completed strokes + current
        // in-progress stroke. This guarantees the canvas always reflects the
        // canonical data, regardless of any concurrent clearing.
        redrawAll(strokesRef.current);
        ctx.strokeStyle = isDark() ? "#f9fafb" : "#111827";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        const xs = currentXs.current;
        const ys = currentYs.current;
        if (xs.length > 1) {
            ctx.beginPath();
            ctx.moveTo(xs[0], ys[0]);
            for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], ys[i]);
            ctx.stroke();
        }
    };

    const endStroke = () => {
        if (!isDrawing.current) return;
        isDrawing.current = false;
        if (currentXs.current.length < 2) {
            currentXs.current = [];
            currentYs.current = [];
            return;
        }
        const newStrokes: Stroke[] = [...strokesRef.current, [currentXs.current, currentYs.current]];
        strokesRef.current = newStrokes;
        currentXs.current = [];
        currentYs.current = [];
        // Sync canvas with the canonical stroke data so anything that may have
        // cleared the canvas mid-draw (re-render, repaint) is reconciled.
        redrawAll(newStrokes);
        setStrokeCount(newStrokes.length);
        recognize(newStrokes);
    };

    const recognize = async (strokes: Stroke[]) => {
        setRecognizing(true);
        setErrorMsg(null);
        try {
            const results = await dictionaryApi.recognizeHandwriting(strokes);
            setSuggestions(results);
            if (results.length === 0) setErrorMsg("Không nhận diện được — thử vẽ lại rõ hơn");
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 401) setErrorMsg("Lỗi 401 — chưa đăng nhập");
            else if (status === 500) setErrorMsg("Lỗi 500 — backend gặp sự cố");
            else setErrorMsg(e?.message ?? "Không kết nối được backend");
            console.error("[Handwriting] recognize error:", e);
        } finally {
            setRecognizing(false);
        }
    };

    const undo = () => {
        const newStrokes = strokesRef.current.slice(0, -1);
        strokesRef.current = newStrokes;
        setStrokeCount(newStrokes.length);
        redrawAll(newStrokes);
        if (newStrokes.length) recognize(newStrokes);
        else setSuggestions([]);
    };

    const clear = () => {
        strokesRef.current = [];
        setStrokeCount(0);
        setSuggestions([]);
        drawGuides();
    };

    const handleSelect = (char: string) => {
        onSelect(char);
        setIsOpen(false);
        clear();
    };

    return (
        <div ref={containerRef} className="relative">
            {/* Pen button */}
            <button
                onClick={() => setIsOpen((v) => !v)}
                title="Viết tay kanji"
                className={`h-9 w-9 flex items-center justify-center rounded-lg transition-all ${
                    isOpen
                        ? "bg-blue-600 text-white shadow-md"
                        : "bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-950/40"
                }`}
            >
                <PencilIcon className="h-5 w-5" />
            </button>

            {/* Drawing panel */}
            {isOpen && (
                <div
                    className="absolute top-full right-0 mt-2 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
                    style={{ width: 304 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                        <div className="flex items-center gap-2">
                            <PencilIcon className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Viết tay</span>
                            <span className="text-xs text-gray-400">({strokeCount} nét)</span>
                        </div>
                        <div className="flex gap-1.5">
                            <button
                                onClick={undo}
                                disabled={strokeCount === 0}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <UndoIcon className="h-3 w-3" /> Hoàn tác
                            </button>
                            <button
                                onClick={clear}
                                className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <TrashIcon className="h-3 w-3" /> Xóa
                            </button>
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="p-4 pb-3 flex justify-center bg-white dark:bg-gray-900">
                        <canvas
                            ref={canvasRef}
                            style={{ width: CANVAS_W, height: CANVAS_H }}
                            className="block cursor-crosshair touch-none rounded-lg"
                            onMouseDown={(e) => { const p = getXY(e); startStroke(p.x, p.y); }}
                            onMouseMove={(e) => { const p = getXY(e); continueStroke(p.x, p.y); }}
                            onMouseUp={endStroke}
                            onMouseLeave={endStroke}
                            onTouchStart={(e) => { e.preventDefault(); const p = getXY(e); startStroke(p.x, p.y); }}
                            onTouchMove={(e) => { e.preventDefault(); const p = getXY(e); continueStroke(p.x, p.y); }}
                            onTouchEnd={(e) => { e.preventDefault(); endStroke(); }}
                        />
                    </div>

                    {/* Suggestions */}
                    <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                        {recognizing ? (
                            <div className="flex items-center justify-center gap-2 h-14 text-sm text-gray-400">
                                <svg className="animate-spin h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Đang nhận diện...
                            </div>
                        ) : errorMsg ? (
                            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                                <span className="text-red-500 shrink-0">⚠</span>
                                <span className="text-xs text-red-600 dark:text-red-400">{errorMsg}</span>
                            </div>
                        ) : suggestions.length > 0 ? (
                            <div className="pt-3 space-y-2">
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Gợi ý</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {suggestions.map((char) => (
                                        <button
                                            key={char}
                                            onClick={() => handleSelect(char)}
                                            className="min-w-[40px] h-10 px-2 flex items-center justify-center text-lg font-medium rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400 transition-all hover:shadow-sm"
                                        >
                                            {char}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-1 h-14 text-gray-400 dark:text-gray-600">
                                <PencilIcon className="h-5 w-5" />
                                <span className="text-xs">Vẽ để nhận diện chữ</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function PencilIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
    );
}

function UndoIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6M3 10l6-6" />
        </svg>
    );
}

function TrashIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    );
}