import { motion } from "motion/react";
import { ArrowRight, PartyPopper, RotateCcw, Skull, Trophy } from "lucide-react";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { formatNumber, GAME_CONFIG } from "../engine";
import type { GamePhase } from "../types";

interface ResultOverlayProps {
    phase: GamePhase;
    round: number;
    score: number;
    targetScore: number;
    runTotal: number;
    highScore: number;
    onNextRound: () => void;
    onNewGame: () => void;
}

const PRIMARY_BTN =
    "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-400 to-orange-500 px-6 py-3 text-base font-bold text-slate-900 shadow-lg shadow-orange-500/30 transition-all hover:from-amber-300 hover:to-orange-400 active:scale-[0.98]";

export function ResultOverlay({
    phase,
    round,
    score,
    targetScore,
    runTotal,
    highScore,
    onNextRound,
    onNewGame,
}: ResultOverlayProps) {
    if (phase !== "roundClear" && phase !== "gameOver" && phase !== "victory") {
        return null;
    }

    const config = {
        roundClear: {
            icon: <Trophy className="size-12 text-amber-300" />,
            title: `Qua vòng ${round}! 🎉`,
            tint: "from-amber-500/20",
        },
        victory: {
            icon: <PartyPopper className="size-12 text-emerald-300" />,
            title: "Xuất sắc! Hoàn thành tất cả các vòng!",
            tint: "from-emerald-500/20",
        },
        gameOver: {
            icon: <Skull className="size-12 text-rose-300" />,
            title: "Hết lượt rồi!",
            tint: "from-rose-500/20",
        },
    }[phase];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-slate-950/80 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.85, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className={`flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-gradient-to-b ${config.tint} to-slate-900 p-8 text-center ring-1 ring-white/10`}
            >
                {config.icon}
                <h2 className="text-2xl font-black text-white">{config.title}</h2>

                <div className="grid w-full grid-cols-2 gap-3">
                    <div className="rounded-xl bg-slate-950/40 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                            Tổng điểm
                        </div>
                        <div className="text-2xl font-black tabular-nums text-amber-200">
                            {formatNumber(runTotal)}
                        </div>
                    </div>
                    <div className="rounded-xl bg-slate-950/40 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-wide text-slate-400">
                            {phase === "roundClear" ? "Mục tiêu" : "Kỷ lục"}
                        </div>
                        <div className="text-2xl font-black tabular-nums text-slate-100">
                            {formatNumber(
                                phase === "roundClear" ? targetScore : highScore,
                            )}
                        </div>
                    </div>
                </div>

                {phase === "roundClear" ? (
                    <button type="button" onClick={onNextRound} className={PRIMARY_BTN}>
                        Vòng tiếp theo
                        <ArrowRight className="size-5" />
                    </button>
                ) : (
                    <button type="button" onClick={onNewGame} className={PRIMARY_BTN}>
                        <RotateCcw className="size-5" />
                        Chơi lại
                    </button>
                )}

                {phase === "roundClear" && (
                    <p className="text-xs text-slate-400">
                        Còn dư {formatNumber(Math.max(0, score - targetScore))} điểm
                        sẽ được cộng dồn sang vòng sau.
                    </p>
                )}
            </motion.div>
        </motion.div>
    );
}

export function HowToPlayDialog({
    open,
    onOpenChange,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-lg">Cách chơi — Bộ Thủ Karuta</DialogTitle>
                    <DialogDescription>
                        Ghép bộ thủ với chữ Hán-Việt để ghi điểm.
                    </DialogDescription>
                </DialogHeader>
                <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-foreground">
                    <li>
                        Giữa màn hình hiện một <b>chữ Kanji Hán-Việt</b> kèm cách đọc{" "}
                        <i>hiragana</i>.
                    </li>
                    <li>
                        Trên tay bạn là các lá <b>bộ thủ (部首)</b>. Hãy chọn những lá là
                        thành phần tạo nên chữ đó.
                    </li>
                    <li>
                        Nhấn <b>Đánh bài</b>: lá đúng ăn điểm{" "}
                        <span className="text-emerald-600">(Điểm × Mult)</span>, lá sai bị{" "}
                        <span className="text-rose-600">Trật</span> và làm đứt chuỗi.
                    </li>
                    <li>
                        Đánh đúng liên tiếp tạo <b>chuỗi combo</b> nhân hệ số ×
                        {GAME_CONFIG.chainDelta} — càng dài càng nhiều điểm.
                    </li>
                    <li>
                        Đạt <b>mục tiêu điểm</b> trong số lượt cho phép để qua vòng. Hết
                        lượt mà chưa đủ điểm là thua.
                    </li>
                    <li>
                        Bí quá? Dùng <b>Bỏ &amp; rút lại</b> để đổi các lá không cần (có
                        giới hạn mỗi vòng).
                    </li>
                </ol>
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                    Mẹo: ví dụ chữ 明 (Minh) = 日 (Nhật) + 月 (Nguyệt). Đánh cả hai lá để
                    ăn combo!
                </p>
            </DialogContent>
        </Dialog>
    );
}
