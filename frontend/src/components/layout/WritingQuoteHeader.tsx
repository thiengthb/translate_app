import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

import { usePrefersReducedMotion } from "@/pages/portfolio/usePrefersReducedMotion";

/**
 * Theme decisions (Hanabun / Sakura):
 *   - Motif: a fountain-pen love-letter — brush-calligraphy Japanese paired
 *     with a smaller handwritten Vietnamese caption underneath, as if
 *     someone jotted a favourite line in the margin.
 *   - Palette: the app's own pink tokens (--primary #ff6b9d → #ff8fab),
 *     never a raw Tailwind pink, so it stays in lockstep with any future
 *     palette tweak.
 *   - Fonts: "Yuji Syuku" (JP, variable brush stroke) for the main line,
 *     "Caveat" (has a Vietnamese glyph subset) for the caption — both
 *     registered as `font-hand-jp` / `font-hand-vi` theme utilities in
 *     index.css, loaded via the Google Fonts link in index.html.
 *   - Mood: quiet and elegant, not flashy — slow blur/fade/rise transitions
 *     and a barely-there ambient glow, rotating every 5s. Pauses on hover so
 *     a mid-read visitor isn't interrupted.
 *
 * Not a Next.js project (Vite + react-router), so no 'use client' directive.
 */

interface Quote {
    jp: string;
    vi: string;
}

const QUOTES: Quote[] = [
    {
        jp: "夢を叶える秘訣は、ひとつずつ諦めずに積み重ねていく日々のささやかな努力の中にあります。",
        vi: "Bí quyết để thực hiện mơ ước nằm ở những nỗ lực nhỏ bé mỗi ngày mà ta kiên trì tích lũy mà không bỏ cuộc.",
    },
    {
        jp: "学問とは、ただ知識を蓄えることではなく、世界をより深く愛するための心を育む旅である。",
        vi: "Học tập không chỉ đơn thuần là tích lũy kiến thức, mà là hành trình nuôi dưỡng tâm hồn để yêu thương thế giới sâu sắc hơn.",
    },
    {
        jp: "どんなに遠い道のりであっても、今日踏み出した一歩は確実に明日のあなたを理想の未来へと近づけてくれます。",
        vi: "Dù con đường có xa đến đâu, bước chân bạn đi hôm nay nhất định sẽ đưa bạn đến gần hơn với tương lai lý tưởng của ngày mai.",
    },
];

const ROTATE_MS = 5000;

const lineTransition = { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const };

export function WritingQuoteHeader() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const reduce = usePrefersReducedMotion();
    const pausedRef = useRef(paused);
    pausedRef.current = paused;

    useEffect(() => {
        const id = window.setInterval(() => {
            if (pausedRef.current) return;
            setIndex((i) => (i + 1) % QUOTES.length);
        }, ROTATE_MS);
        return () => window.clearInterval(id);
    }, []);

    const quote = QUOTES[index];

    return (
        <div
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            className="relative hidden min-w-0 max-w-4xl flex-1 select-none flex-col justify-center overflow-hidden pl-6 lg:pl-10 md:flex"
        >
            {/* Ambient glow — a soft pink wash breathing behind the ink,
                independent of the quote rotation. Purely decorative. */}
            {!reduce && (
                <motion.span
                    aria-hidden
                    className="pointer-events-none absolute left-0 top-1/2 h-16 w-72 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,143,171,0.35),transparent)] blur-2xl"
                    animate={{ opacity: [0.4, 0.75, 0.4], scale: [1, 1.08, 1] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                />
            )}

            <motion.div
                animate={reduce ? undefined : { y: [0, -3, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="relative min-w-0"
            >
                <AnimatePresence mode="wait">
                    <motion.div key={index} className="min-w-0">
                        <motion.p
                            initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={reduce ? undefined : { opacity: 0, y: -10, filter: "blur(4px)" }}
                            transition={lineTransition}
                            className="font-hand-jp truncate bg-gradient-to-r from-primary via-primary to-[#ff8fab] bg-clip-text text-lg leading-snug tracking-wide text-transparent lg:text-2xl"
                            lang="ja"
                        >
                            {quote.jp}
                        </motion.p>
                        <motion.p
                            initial={reduce ? false : { opacity: 0, y: 12, filter: "blur(5px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={reduce ? undefined : { opacity: 0, y: -8, filter: "blur(3px)" }}
                            transition={{ ...lineTransition, delay: reduce ? 0 : 0.12 }}
                            className="font-hand-vi mt-0.5 hidden truncate text-sm italic text-muted-foreground/80 lg:block lg:text-base"
                            lang="vi"
                        >
                            {quote.vi}
                        </motion.p>
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
