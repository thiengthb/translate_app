import { motion } from "motion/react";
import { PartyPopper, RotateCcw, Skull } from "lucide-react";

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
    runTotal: number;
    highScore: number;
    onNewGame: () => void;
}

const PRIMARY_BTN =
    "flex items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#ff6b9d] to-[#ff8fab] px-6 py-3 text-base font-bold text-white shadow-lg shadow-[#ff6b9d]/30 transition-all hover:from-[#ff5b93] hover:to-[#ff7fa1] active:scale-[0.98]";

/**
 * End-of-run overlay for victory / game-over. The round-clear case is handled
 * separately by {@link RewardOverlay} (the buff picker).
 */
export function ResultOverlay({
    phase,
    runTotal,
    highScore,
    onNewGame,
}: ResultOverlayProps) {
    if (phase !== "gameOver" && phase !== "victory") {
        return null;
    }

    const config = {
        victory: {
            icon: <PartyPopper className="size-12 text-emerald-500" />,
            title: "Xuất sắc! Hoàn thành tất cả các vòng!",
            tint: "from-emerald-50",
        },
        gameOver: {
            icon: <Skull className="size-12 text-rose-400" />,
            title: "Hết lượt rồi!",
            tint: "from-rose-50",
        },
    }[phase];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-[#3a2e33]/20 p-4 backdrop-blur-sm"
        >
            <motion.div
                initial={{ scale: 0.85, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 280, damping: 24 }}
                className={`flex w-full max-w-sm flex-col items-center gap-5 rounded-2xl bg-gradient-to-b ${config.tint} to-white p-8 text-center shadow-2xl ring-1 ring-white/70`}
            >
                {config.icon}
                <h2 className="text-2xl font-black text-[#3a2e33]">{config.title}</h2>

                <div className="grid w-full grid-cols-2 gap-3">
                    <div className="rounded-xl bg-[#fff0f4] px-3 py-3 ring-1 ring-[#fbeaf0]">
                        <div className="text-[11px] uppercase tracking-wide text-[#9a8e92]">
                            Tổng điểm
                        </div>
                        <div className="text-2xl font-black tabular-nums text-[#ff6b9d]">
                            {formatNumber(runTotal)}
                        </div>
                    </div>
                    <div className="rounded-xl bg-[#fff0f4] px-3 py-3 ring-1 ring-[#fbeaf0]">
                        <div className="text-[11px] uppercase tracking-wide text-[#9a8e92]">
                            Kỷ lục
                        </div>
                        <div className="text-2xl font-black tabular-nums text-[#3a2e33]">
                            {formatNumber(highScore)}
                        </div>
                    </div>
                </div>

                <button type="button" onClick={onNewGame} className={PRIMARY_BTN}>
                    <RotateCcw className="size-5" />
                    Chơi lại
                </button>
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
                        Qua mỗi vòng, bạn nhận một <b>lá bùa (お守り)</b> — chọn 1 trong 3
                        để tăng sức mạnh ghi điểm. Bùa càng nhiều, càng dễ theo kịp mục
                        tiêu tăng dần. Giữ tối đa 5 lá.
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
