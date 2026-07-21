import { useState } from "react";
import { Lightbulb, Puzzle } from "lucide-react";

import { useKanjiGame } from "./useKanjiGame";
import { GAME_CONFIG } from "./engine";
import { isMuted, setMuted } from "./sound";
import { TopBar } from "./components/TopBar";
import { PromptStand } from "./components/PromptStand";
import { PlayArea } from "./components/PlayArea";
import { Hand } from "./components/Hand";
import { ScorePanel } from "./components/ScorePanel";
import { BuffTray } from "./components/BuffTray";
import { HowToPlayDialog, ResultOverlay } from "./components/Overlays";
import { RewardOverlay } from "./components/RewardOverlay";
import { SakuraField } from "./components/SakuraField";

export function GameBoard() {
    const game = useKanjiGame();
    const { state } = game;

    const [helpOpen, setHelpOpen] = useState(false);
    const [muted, setMutedState] = useState(isMuted());

    const toggleMute = () => {
        const next = !muted;
        setMuted(next);
        setMutedState(next);
    };

    const radicalCount = new Set(state.prompt.radicalIds).size;

    return (
        <>
            {/* flex-1 min-h-0 fills the viewport height slice given by the page
                wrapper — the karuta "table" never grows taller than the space.
                Glass sakura surface (matches the app shell) instead of the old
                casino-dark board. */}
            <div className="relative flex flex-1 min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-b from-white/85 via-[#fff2f6]/80 to-[#ffe4ee]/75 p-3 shadow-[0_20px_60px_-24px_rgba(255,107,157,0.45)] backdrop-blur-md sm:p-4">
                {/* ambient sakura petal field + soft pink/gold glows */}
                <SakuraField />
                <div className="pointer-events-none absolute -top-24 right-10 h-56 w-56 rounded-full bg-[#ff8fab]/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-[#ffc95c]/20 blur-3xl" />

                {/* content rides above the petal layer */}
                <div className="relative z-10 flex flex-1 min-h-0 flex-col gap-3">
                <TopBar
                    score={state.score}
                    targetScore={state.targetScore}
                    progress={game.progress}
                    round={state.round}
                    highScore={game.highScore}
                    muted={muted}
                    onToggleMute={toggleMute}
                    onHelp={() => setHelpOpen(true)}
                    onRestart={game.newGame}
                />

                {/* charm shelf — the run's collected buffs */}
                <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl border border-white/60 bg-white/60 px-3 py-1.5 shadow-sm backdrop-blur-sm">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-[#c77a99]">
                        Lá bùa
                    </span>
                    <BuffTray buffs={state.buffs} />
                </div>

                {/* middle: prompt (left/top) + score panel (right) — fills remaining height */}
                <div className="relative flex flex-1 min-h-0 flex-col gap-3 lg:flex-row">
                    {/* centre stage: prompt + thrown cards */}
                    <div className="flex flex-1 min-h-0 flex-col items-center gap-2">
                        <PromptStand prompt={state.prompt} revealed={state.hintUsed} />
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/60 bg-white/70 px-3 py-1 text-xs text-[#6b5b61] shadow-sm backdrop-blur-sm">
                                <Puzzle className="size-3.5 text-[#ff6b9d]" />
                                Cần tìm{" "}
                                <b className="text-[#ff6b9d]">{radicalCount}</b> bộ thủ
                            </span>
                            <button
                                type="button"
                                onClick={game.useHint}
                                disabled={!game.canHint}
                                title={
                                    state.hintUsed
                                        ? "Đã dùng gợi ý lượt này"
                                        : `Hé lộ chữ Kanji (giữ lại ${Math.round(
                                              GAME_CONFIG.hintPenalty * 100,
                                          )}% điểm lượt này)`
                                }
                                className="inline-flex items-center gap-1.5 rounded-full border border-[#ffc95c]/50 bg-[#ffc95c]/20 px-3 py-1 text-xs font-semibold text-[#a06a12] shadow-sm transition-colors hover:bg-[#ffc95c]/35 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Lightbulb className="size-3.5" />
                                {state.hintUsed
                                    ? "Đã gợi ý"
                                    : `Gợi ý (−${Math.round(
                                          (1 - GAME_CONFIG.hintPenalty) * 100,
                                      )}%)`}
                            </button>
                        </div>
                        <PlayArea played={state.played} floats={state.floats} />
                    </div>

                    {/* right rail: score + controls */}
                    <div className="w-full lg:w-80 lg:shrink-0">
                        <ScorePanel
                            readout={state.readout}
                            selectedCount={state.selectedIds.length}
                            turnsLeft={state.turnsLeft}
                            maxTurns={state.maxTurns}
                            round={state.round}
                            discardsLeft={state.discardsLeft}
                            canPlay={game.canPlay}
                            canDiscard={game.canDiscard}
                            busy={game.isBusy}
                            onPlay={game.play}
                            onDiscard={game.discard}
                        />
                    </div>
                </div>

                {/* hand across the bottom — shrink-0 keeps height fixed */}
                <div className="shrink-0 rounded-2xl border border-white/60 bg-white/60 p-2 shadow-sm backdrop-blur-sm">
                    <div className="mb-1.5 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-[#c77a99]">
                            Bài trên tay
                        </span>
                        <span className="text-xs text-[#9a8e92]">
                            Đã chọn {state.selectedIds.length}/{GAME_CONFIG.maxSelect}
                        </span>
                    </div>
                    <Hand
                        cards={state.hand}
                        selectedIds={state.selectedIds}
                        disabled={game.isBusy || state.phase !== "playing"}
                        onToggle={game.toggleSelect}
                    />
                </div>
                </div>
                {/* end z-10 content — overlays below cover the whole table */}

                {state.phase === "roundClear" && (
                    <RewardOverlay
                        round={state.round}
                        score={state.score}
                        targetScore={state.targetScore}
                        buffs={state.buffs}
                        rewardOptions={state.rewardOptions}
                        rerollsLeft={state.rerollsLeft}
                        onChoose={game.chooseBuff}
                        onReroll={game.rerollReward}
                        onSkip={game.skipReward}
                    />
                )}

                <ResultOverlay
                    phase={state.phase}
                    runTotal={state.runTotal}
                    highScore={game.highScore}
                    onNewGame={game.newGame}
                />
            </div>

            <HowToPlayDialog open={helpOpen} onOpenChange={setHelpOpen} />
        </>
    );
}
