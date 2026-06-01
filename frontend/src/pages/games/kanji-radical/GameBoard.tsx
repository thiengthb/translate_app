import { useState } from "react";
import { Puzzle } from "lucide-react";

import { useKanjiGame } from "./useKanjiGame";
import { GAME_CONFIG } from "./engine";
import { isMuted, setMuted } from "./sound";
import { TopBar } from "./components/TopBar";
import { PromptStand } from "./components/PromptStand";
import { PlayArea } from "./components/PlayArea";
import { Hand } from "./components/Hand";
import { ScorePanel } from "./components/ScorePanel";
import { HowToPlayDialog, ResultOverlay } from "./components/Overlays";

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
            <div className="relative flex flex-col gap-5 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 p-4 shadow-2xl sm:p-6">
                {/* soft ambient glows */}
                <div className="pointer-events-none absolute -top-24 right-10 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-indigo-500/10 blur-3xl" />

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

                <div className="relative flex flex-col gap-5 lg:flex-row">
                    {/* centre stage: prompt + thrown cards */}
                    <div className="flex flex-1 flex-col items-center gap-3 pt-2">
                        <PromptStand prompt={state.prompt} />
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/50 px-3 py-1 text-xs text-slate-400 ring-1 ring-white/10">
                            <Puzzle className="size-3.5 text-amber-400" />
                            Cần tìm{" "}
                            <b className="text-amber-300">{radicalCount}</b> bộ thủ
                        </span>
                        <PlayArea played={state.played} floats={state.floats} />
                    </div>

                    {/* right rail: score + controls */}
                    <div className="w-full lg:w-80">
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

                {/* hand across the bottom */}
                <div className="rounded-2xl bg-slate-950/40 p-3 ring-1 ring-white/5">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-xs uppercase tracking-wide text-slate-500">
                            Bài trên tay
                        </span>
                        <span className="text-xs text-slate-500">
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

                <ResultOverlay
                    phase={state.phase}
                    round={state.round}
                    score={state.score}
                    targetScore={state.targetScore}
                    runTotal={state.runTotal}
                    highScore={game.highScore}
                    onNextRound={game.nextRound}
                    onNewGame={game.newGame}
                />
            </div>

            <HowToPlayDialog open={helpOpen} onOpenChange={setHelpOpen} />
        </>
    );
}
