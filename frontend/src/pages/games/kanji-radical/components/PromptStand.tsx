import { AnimatePresence, motion } from "motion/react";

import { LEVEL_LABEL } from "../engine";
import type { KanjiPrompt } from "../types";

const JP_SERIF =
    '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif';

const LEVEL_TINT: Record<string, string> = {
    N5: "bg-emerald-500/20 text-emerald-200 ring-emerald-400/40",
    N4: "bg-sky-500/20 text-sky-200 ring-sky-400/40",
    N3: "bg-amber-500/20 text-amber-200 ring-amber-400/40",
    N2: "bg-orange-500/20 text-orange-200 ring-orange-400/40",
    N1: "bg-rose-500/20 text-rose-200 ring-rose-400/40",
};

export function PromptStand({ prompt }: { prompt: KanjiPrompt }) {
    return (
        <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                Tìm bộ thủ của chữ
            </span>

            <AnimatePresence mode="wait">
                <motion.div
                    key={prompt.id}
                    initial={{ opacity: 0, y: 16, scale: 0.94 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -16, scale: 0.94 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col items-center"
                >
                    {/* hiragana furigana */}
                    <span
                        className="text-lg text-amber-200/90 sm:text-xl"
                        style={{ fontFamily: JP_SERIF }}
                    >
                        {prompt.hiragana}
                    </span>

                    {/* the kanji — focal point */}
                    <span
                        className="my-1 bg-gradient-to-b from-white to-amber-100 bg-clip-text text-[7rem] leading-none text-transparent drop-shadow-[0_4px_18px_rgba(251,191,36,0.25)] sm:text-[9rem]"
                        style={{ fontFamily: JP_SERIF }}
                    >
                        {prompt.kanji}
                    </span>

                    <div className="mt-1 flex items-center gap-2">
                        <span className="text-xl font-bold text-amber-300 sm:text-2xl">
                            {prompt.hanViet}
                        </span>
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${
                                LEVEL_TINT[prompt.level] ?? LEVEL_TINT.N5
                            }`}
                            title={LEVEL_LABEL[prompt.level]}
                        >
                            {prompt.level}
                        </span>
                    </div>
                    <span className="mt-0.5 text-sm text-slate-400">
                        {prompt.meaning}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
