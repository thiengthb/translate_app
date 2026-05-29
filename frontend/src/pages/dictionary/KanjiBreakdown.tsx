import { useState, useMemo, useRef, useEffect } from "react";
import { fetchKanjiBreakdown } from "./kanjiBreakdownData";

// ── Types ─────────────────────────────────────────────────────────────
export interface KanjiBreakdownComponent {
    id: string;
    char: string;
    meaning: string;
}

export interface KanjiBreakdownData {
    kanji: string;
    rootId: string;
    components: KanjiBreakdownComponent[];   // includes the root
    edges: [string, string][];               // [parentId, childId]
}

interface NodePos {
    id: string;
    char: string;
    meaning: string;
    x: number;
    y: number;
    depth: number;
    isRoot: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────
const RING_RADIUS_BASE = 130;
const RING_RADIUS_STEP = 105;
const ROOT_R = 40;
const NODE_R = 30;
const PADDING = 60;

// ── Radial-tree layout (ID-based) ─────────────────────────────────────
function layoutTree(data: KanjiBreakdownData): NodePos[] {
    const byId = new Map<string, KanjiBreakdownComponent>();
    for (const c of data.components) byId.set(c.id, c);

    const childMap = new Map<string, string[]>();
    for (const [p, c] of data.edges) {
        if (!childMap.has(p)) childMap.set(p, []);
        childMap.get(p)!.push(c);
    }

    const leafCount = new Map<string, number>();
    function countLeaves(id: string): number {
        if (leafCount.has(id)) return leafCount.get(id)!;
        const ch = childMap.get(id) || [];
        const n = ch.length === 0 ? 1 : ch.reduce((s, x) => s + countLeaves(x), 0);
        leafCount.set(id, n);
        return n;
    }
    countLeaves(data.rootId);

    const result: NodePos[] = [];
    const root = byId.get(data.rootId)!;
    result.push({ id: data.rootId, char: root.char, meaning: "", x: 0, y: 0, depth: 0, isRoot: true });

    function place(id: string, depth: number, startAng: number, endAng: number) {
        if (depth > 0) {
            const midAng = (startAng + endAng) / 2;
            const r = RING_RADIUS_BASE + (depth - 1) * RING_RADIUS_STEP;
            const m = byId.get(id)!;
            result.push({
                id, char: m.char, meaning: m.meaning,
                x: r * Math.cos(midAng),
                y: r * Math.sin(midAng),
                depth,
                isRoot: false,
            });
        }
        const children = childMap.get(id) || [];
        if (!children.length) return;
        const total = leafCount.get(id)!;
        let cur = startAng;
        for (const child of children) {
            const span = (endAng - startAng) * (leafCount.get(child)! / total);
            place(child, depth + 1, cur, cur + span);
            cur += span;
        }
    }
    place(data.rootId, 0, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI);
    return result;
}

// ── Bounding-box → square viewBox ─────────────────────────────────────
function getViewBox(nodes: NodePos[]) {
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const minX = Math.min(...xs) - PADDING;
    const maxX = Math.max(...xs) + PADDING;
    const minY = Math.min(...ys) - PADDING;
    const maxY = Math.max(...ys) + PADDING;
    const w = maxX - minX;
    const h = maxY - minY;
    const size = Math.max(w, h);
    return {
        vbX: minX - (size - w) / 2,
        vbY: minY - (size - h) / 2,
        vbSize: size,
    };
}

// ── Diagram component ─────────────────────────────────────────────────
function BreakdownDiagram({ data }: { data: KanjiBreakdownData }) {
    const [hovered, setHovered]     = useState<NodePos | null>(null);
    const [container, setContainer] = useState({ w: 0, h: 0 });
    const wrapRef = useRef<HTMLDivElement>(null);

    const nodes = useMemo(() => layoutTree(data), [data]);
    const posById = useMemo(() => {
        const m = new Map<string, NodePos>();
        for (const n of nodes) m.set(n.id, n);
        return m;
    }, [nodes]);

    const { vbX, vbY, vbSize } = useMemo(() => getViewBox(nodes), [nodes]);

    useEffect(() => {
        if (!wrapRef.current) return;
        const ro = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setContainer({ w: width, h: height });
        });
        ro.observe(wrapRef.current);
        return () => ro.disconnect();
    }, []);

    const svgToPixel = (x: number, y: number) => ({
        px: ((x - vbX) / vbSize) * container.w,
        py: ((y - vbY) / vbSize) * container.h,
    });

    return (
        <div ref={wrapRef} className="relative w-full aspect-square max-w-md mx-auto select-none">
            <svg
                viewBox={`${vbX} ${vbY} ${vbSize} ${vbSize}`}
                className="w-full h-full block"
                role="img"
                aria-label={`Sơ đồ cấu thành chữ ${data.kanji}`}
            >
                <defs>
                    <linearGradient id="kb-root-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%"   stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <filter id="kb-shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.15" />
                    </filter>
                </defs>

                {/* ── Edges ── */}
                <g>
                    {data.edges.map(([from, to], i) => {
                        const a = posById.get(from);
                        const b = posById.get(to);
                        if (!a || !b) return null;
                        const isActive = hovered && (hovered.id === from || hovered.id === to);
                        return (
                            <line
                                key={i}
                                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                                strokeWidth={isActive ? 2.5 : 1.6}
                                strokeLinecap="round"
                                className={`transition-all ${
                                    isActive
                                        ? "stroke-blue-400 dark:stroke-blue-500"
                                        : "stroke-gray-300 dark:stroke-gray-700"
                                }`}
                            />
                        );
                    })}
                </g>

                {/* ── Nodes ── */}
                <g>
                    {nodes.map((n) => (
                        <g
                            key={n.id}
                            onMouseEnter={() => !n.isRoot && setHovered(n)}
                            onMouseLeave={() => setHovered((h) => (h?.id === n.id ? null : h))}
                            style={{ cursor: n.isRoot ? "default" : "pointer" }}
                        >
                            {n.isRoot ? (
                                <>
                                    <circle
                                        cx={n.x} cy={n.y} r={ROOT_R}
                                        fill="url(#kb-root-grad)"
                                        filter="url(#kb-shadow)"
                                    />
                                    <text
                                        x={n.x} y={n.y}
                                        textAnchor="middle" dominantBaseline="central"
                                        fontSize={42} fontWeight={900}
                                        className="fill-white pointer-events-none"
                                        style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                                    >
                                        {n.char}
                                    </text>
                                </>
                            ) : (
                                <>
                                    <circle
                                        cx={n.x} cy={n.y} r={NODE_R}
                                        strokeWidth={hovered?.id === n.id ? 2.5 : 1.5}
                                        className={`transition-all fill-white dark:fill-gray-800 ${
                                            hovered?.id === n.id
                                                ? "stroke-blue-500 dark:stroke-blue-400"
                                                : "stroke-gray-300 dark:stroke-gray-600"
                                        }`}
                                        filter="url(#kb-shadow)"
                                    />
                                    <text
                                        x={n.x} y={n.y}
                                        textAnchor="middle" dominantBaseline="central"
                                        fontSize={30} fontWeight={800}
                                        className="fill-gray-800 dark:fill-gray-100 pointer-events-none"
                                        style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
                                    >
                                        {n.char}
                                    </text>
                                </>
                            )}
                        </g>
                    ))}
                </g>
            </svg>

            {/* ── Tooltip ── */}
            {hovered && !hovered.isRoot && container.w > 0 && (() => {
                const { px, py } = svgToPixel(hovered.x, hovered.y);
                const flipBelow = py < 60;
                return (
                    <div
                        className="absolute z-10 pointer-events-none"
                        style={{
                            left: px,
                            top:  py,
                            transform: flipBelow
                                ? "translate(-50%, 60%)"
                                : "translate(-50%, -135%)",
                        }}
                    >
                        <div className="bg-gray-900/95 dark:bg-gray-100/95 text-white dark:text-gray-900 text-xs rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap flex items-center gap-2">
                            <span className="text-base font-black">{hovered.char}</span>
                            <span className="opacity-80">{hovered.meaning || "Chưa có nghĩa"}</span>
                        </div>
                    </div>
                );
            })()}

            {/* ── Legend ── */}
            <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-3 text-[10px] text-gray-400 dark:text-gray-500 pointer-events-none">
                <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500" />
                    Chữ gốc
                </span>
                <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full border border-gray-400 bg-white dark:bg-gray-800" />
                    Thành phần
                </span>
            </div>
        </div>
    );
}

// ── Main public component: handles loading ────────────────────────────
export function KanjiBreakdown({ character }: { character: string }) {
    const [data,  setData]  = useState<KanjiBreakdownData | null>(null);
    const [phase, setPhase] = useState<"loading" | "ok" | "empty" | "error">("loading");

    useEffect(() => {
        let cancelled = false;
        setPhase("loading");
        setData(null);

        fetchKanjiBreakdown(character)
            .then((d) => {
                if (cancelled) return;
                if (!d)          { setPhase("empty"); return; }
                setData(d);
                setPhase("ok");
            })
            .catch(() => {
                if (!cancelled) setPhase("error");
            });

        return () => { cancelled = true; };
    }, [character]);

    if (phase === "loading") {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="h-6 w-6 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <p className="text-xs text-gray-400 dark:text-gray-500">Đang phân tích cấu thành…</p>
            </div>
        );
    }

    if (phase === "empty") {
        return (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
                Chữ này không có cấu thành để phân tích.
            </p>
        );
    }

    if (phase === "error" || !data) {
        return (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
                Không tải được dữ liệu cấu thành.
            </p>
        );
    }

    return <BreakdownDiagram data={data} />;
}