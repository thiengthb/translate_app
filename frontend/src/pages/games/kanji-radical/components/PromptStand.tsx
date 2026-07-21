import { AnimatePresence, motion } from "motion/react";

import { LEVEL_LABEL } from "../engine";
import type { KanjiPrompt } from "../types";

const JP_SERIF =
    '"Noto Serif JP", "Yu Mincho", "Hiragino Mincho ProN", "MS Mincho", serif';

const LEVEL_TINT: Record<string, string> = {
    N5: "bg-emerald-50 text-emerald-600 ring-emerald-300/60",
    N4: "bg-sky-50 text-sky-600 ring-sky-300/60",
    N3: "bg-amber-50 text-amber-600 ring-amber-300/60",
    N2: "bg-orange-50 text-orange-600 ring-orange-300/60",
    N1: "bg-rose-50 text-rose-600 ring-rose-300/60",
};

export function PromptStand({
    prompt,
    revealed = false,
}: {
    prompt: KanjiPrompt;
    /** When true the kanji glyph is shown (player used a hint). */
    revealed?: boolean;
}) {
    return (
        <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-[#c77a99]">
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
                        className="text-base text-[#c77a99] sm:text-lg"
                        style={{ fontFamily: JP_SERIF }}
                    >
                        {prompt.hiragana}
                    </span>

                    {/* Hán-Việt name — focal point. The kanji glyph itself is
                        hidden on purpose: the player must recall which radicals
                        compose this word from the reading/meaning alone — unless
                        they spend a hint to reveal it. */}
                    {revealed ? (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8, rotateX: -40 }}
                            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20 }}
                            className="bg-gradient-to-b from-[#ff6b9d] to-[#ff8fab] bg-clip-text text-[4.5rem] leading-none text-transparent drop-shadow-[0_4px_18px_rgba(255,107,157,0.3)] sm:text-[5.5rem]"
                            style={{ fontFamily: JP_SERIF }}
                        >
                            {prompt.kanji}
                        </motion.span>
                    ) : (
                        <span className="bg-gradient-to-b from-[#ff6b9d] to-[#ff8fab] bg-clip-text text-[3rem] font-bold leading-tight text-transparent drop-shadow-[0_4px_18px_rgba(255,107,157,0.25)] sm:text-[4rem]">
                            {prompt.hanViet}
                        </span>
                    )}

                    <div className="mt-1 flex items-center gap-2">
                        {revealed && (
                            <span className="text-lg font-bold text-[#ff6b9d] sm:text-xl">
                                {prompt.hanViet}
                            </span>
                        )}
                        <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ring-1 ${
                                LEVEL_TINT[prompt.level] ?? LEVEL_TINT.N5
                            }`}
                            title={LEVEL_LABEL[prompt.level]}
                        >
                            {prompt.level}
                        </span>
                    </div>
                    <span className="mt-0.5 text-sm text-[#6b5b61]">
                        {prompt.meaning}
                    </span>
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
