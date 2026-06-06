/**
 * Stateful "game manager" for the Kanji Radical game.
 *
 * A `useReducer` holds the board; an async orchestrator (`play`) sequences
 * the score resolution — base hit → level bonus → chain — dispatching
 * incremental updates with small delays so the readout animates the way the
 * reference game's `process_single_word` does. Concurrency is guarded so a
 * turn can't be double-resolved, and all timers bail out after unmount.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import {
    GAME_CONFIG,
    buildScoreSteps,
    createInitialState,
    generateHand,
    isCorrect,
    pickPrompt,
    targetForRound,
} from "./engine";
import {
    MAX_BUFFS,
    applyCardBuffs,
    applyFinalBuffs,
    rollRewards,
    roundTurnBonus,
    trimMult,
} from "./buffs";
import { RADICALS } from "./data";
import { playSfx } from "./sound";
import type {
    BuffRunState,
    FloatingText,
    GameState,
    PlayedCard,
    RadicalCard,
    ScoreReadout,
} from "./types";

const HI_SCORE_KEY = "kanji-radical.highScore";

/** Per-step animation delay (ms). Lower = snappier resolution. */
const STEP = 320;

type Action =
    | { type: "TOGGLE_SELECT"; id: string }
    | { type: "USE_HINT" }
    | { type: "BEGIN_PLAY"; played: PlayedCard[] }
    | { type: "SET_READOUT"; readout: ScoreReadout }
    | { type: "SET_PLAYED_STATE"; cardId: string; state: PlayedCard["state"] }
    | { type: "ADD_FLOAT"; float: FloatingText }
    | { type: "REMOVE_FLOAT"; id: string }
    | { type: "COMMIT_TURN"; turnScore: number; buffRunState: BuffRunState }
    | { type: "DISCARD"; ids: string[] }
    | { type: "CHOOSE_BUFF"; id: string }
    | { type: "SKIP_REWARD" }
    | { type: "REROLL_REWARD" }
    | { type: "NEW_GAME" };

function refillHand(
    keep: RadicalCard[],
    correctIds: string[],
    handSize = GAME_CONFIG.handSize,
): RadicalCard[] {
    const present = new Set(keep.map((c) => c.id));
    // Guarantee the prompt stays solvable: re-add any discarded answer.
    const restored = [...keep];
    for (const id of correctIds) {
        if (!present.has(id)) {
            const card = RADICALS.find((r) => r.id === id);
            if (card) {
                restored.push(card);
                present.add(id);
            }
        }
    }
    const distractors = RADICALS.filter((r) => !present.has(r.id)).sort(
        () => Math.random() - 0.5,
    );
    while (restored.length < handSize && distractors.length > 0) {
        restored.push(distractors.shift()!);
    }
    return restored.sort(() => Math.random() - 0.5);
}

/**
 * Build the next-round state after the reward screen: carry over surplus
 * score, scale the target, refresh prompt/hand, and grant any Túi Thần Kỳ
 * bonus turns. Assumes `state.buffs` is already up to date (the picked charm
 * has been added by the caller). Victory on the final round is resolved at
 * clear-time in COMMIT_TURN, so this only ever advances within the run.
 */
function advanceRound(state: GameState): GameState {
    const carry = Math.max(0, state.score - state.targetScore);
    const nextRound = state.round + 1;
    if (nextRound > GAME_CONFIG.winRound) {
        return { ...state, phase: "victory", round: nextRound, rewardOptions: [] };
    }
    const prompt = pickPrompt(state.prompt.id);
    return {
        ...state,
        phase: "playing",
        round: nextRound,
        targetScore: targetForRound(nextRound),
        score: carry,
        turnsLeft: state.maxTurns + roundTurnBonus(state.buffs),
        discardsLeft: state.maxDiscards,
        prompt,
        hand: generateHand(prompt),
        hintUsed: false,
        played: [],
        floats: [],
        readout: { point: 0, mult: 0, turnScore: 0 },
        rewardOptions: [],
    };
}

function reducer(state: GameState, action: Action): GameState {
    switch (action.type) {
        case "TOGGLE_SELECT": {
            if (state.phase !== "playing") return state;
            const selected = state.selectedIds.includes(action.id)
                ? state.selectedIds.filter((id) => id !== action.id)
                : state.selectedIds.length < GAME_CONFIG.maxSelect
                  ? [...state.selectedIds, action.id]
                  : state.selectedIds;
            return { ...state, selectedIds: selected };
        }

        case "USE_HINT": {
            if (state.phase !== "playing" || state.hintUsed) return state;
            return { ...state, hintUsed: true };
        }

        case "BEGIN_PLAY": {
            const playedIds = new Set(action.played.map((p) => p.card.id));
            return {
                ...state,
                phase: "scoring",
                hand: state.hand.filter((c) => !playedIds.has(c.id)),
                selectedIds: [],
                played: action.played,
                floats: [],
                readout: { point: 0, mult: 0, turnScore: 0 },
            };
        }

        case "SET_READOUT":
            return { ...state, readout: action.readout };

        case "SET_PLAYED_STATE":
            return {
                ...state,
                played: state.played.map((p) =>
                    p.card.id === action.cardId ? { ...p, state: action.state } : p,
                ),
            };

        case "ADD_FLOAT":
            return { ...state, floats: [...state.floats, action.float] };

        case "REMOVE_FLOAT":
            return {
                ...state,
                floats: state.floats.filter((f) => f.id !== action.id),
            };

        case "COMMIT_TURN": {
            const score = state.score + action.turnScore;
            const runTotal = state.runTotal + action.turnScore;
            const turnsLeft = Math.max(0, state.turnsLeft - 1);
            const buffRunState = action.buffRunState;

            if (score >= state.targetScore) {
                // Clearing the final round wins the run outright — no reward.
                if (state.round >= GAME_CONFIG.winRound) {
                    return {
                        ...state,
                        phase: "victory",
                        score,
                        runTotal,
                        turnsLeft,
                        buffRunState,
                        played: [],
                        floats: [],
                    };
                }
                // Otherwise open the charm reward screen.
                return {
                    ...state,
                    phase: "roundClear",
                    score,
                    runTotal,
                    turnsLeft,
                    buffRunState,
                    played: [],
                    floats: [],
                    readout: { point: 0, mult: 0, turnScore: action.turnScore },
                    rewardOptions: rollRewards(3, state.buffs),
                };
            }
            if (turnsLeft <= 0) {
                return {
                    ...state,
                    phase: "gameOver",
                    score,
                    runTotal,
                    turnsLeft,
                    buffRunState,
                    played: [],
                    floats: [],
                };
            }
            const prompt = pickPrompt(state.prompt.id);
            return {
                ...state,
                phase: "playing",
                score,
                runTotal,
                turnsLeft,
                buffRunState,
                prompt,
                hand: generateHand(prompt),
                hintUsed: false,
                played: [],
                floats: [],
                readout: { point: 0, mult: 0, turnScore: 0 },
            };
        }

        case "DISCARD": {
            if (state.phase !== "playing" || state.discardsLeft <= 0) return state;
            const ids = new Set(action.ids);
            const keep = state.hand.filter((c) => !ids.has(c.id));
            return {
                ...state,
                hand: refillHand(keep, state.prompt.radicalIds),
                selectedIds: [],
                discardsLeft: state.discardsLeft - 1,
            };
        }

        case "CHOOSE_BUFF": {
            if (state.phase !== "roundClear") return state;
            const canTake =
                !state.buffs.includes(action.id) &&
                state.buffs.length < MAX_BUFFS;
            const buffs = canTake ? [...state.buffs, action.id] : state.buffs;
            return advanceRound({ ...state, buffs });
        }

        case "SKIP_REWARD": {
            if (state.phase !== "roundClear") return state;
            return advanceRound(state);
        }

        case "REROLL_REWARD": {
            if (state.phase !== "roundClear" || state.rerollsLeft <= 0)
                return state;
            return {
                ...state,
                rewardOptions: rollRewards(3, state.buffs),
                rerollsLeft: state.rerollsLeft - 1,
            };
        }

        case "NEW_GAME":
            return createInitialState();

        default:
            return state;
    }
}

export interface KanjiGameApi {
    state: GameState;
    progress: number;
    highScore: number;
    canPlay: boolean;
    canDiscard: boolean;
    canHint: boolean;
    isBusy: boolean;
    toggleSelect: (id: string) => void;
    play: () => void;
    discard: () => void;
    useHint: () => void;
    chooseBuff: (id: string) => void;
    skipReward: () => void;
    rerollReward: () => void;
    newGame: () => void;
}

export function useKanjiGame(): KanjiGameApi {
    const [state, dispatch] = useReducer(reducer, undefined, createInitialState);

    // Latest state for the async orchestrator (avoids stale closures).
    const stateRef = useRef(state);
    stateRef.current = state;

    const mountedRef = useRef(true);
    const busyRef = useRef(false);
    const floatSeq = useRef(0);

    const [highScore, setHighScore] = useState(0);

    useEffect(() => {
        mountedRef.current = true;
        try {
            const saved = Number(localStorage.getItem(HI_SCORE_KEY));
            if (!Number.isNaN(saved)) setHighScore(saved);
        } catch {
            /* localStorage may be unavailable — ignore */
        }
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Persist the best run total whenever it climbs past the record.
    useEffect(() => {
        if (state.runTotal > highScore) {
            setHighScore(state.runTotal);
            try {
                localStorage.setItem(HI_SCORE_KEY, String(state.runTotal));
            } catch {
                /* ignore */
            }
        }
    }, [state.runTotal, highScore]);

    const wait = (ms: number) =>
        new Promise<void>((resolve) => setTimeout(resolve, ms));

    const emitFloat = useCallback(
        (cardId: string, text: string, kind: FloatingText["kind"]) => {
            const id = `f${floatSeq.current++}`;
            dispatch({ type: "ADD_FLOAT", float: { id, cardId, text, kind } });
            // Self-expire so the centre area doesn't accumulate stale labels.
            setTimeout(() => {
                if (mountedRef.current) dispatch({ type: "REMOVE_FLOAT", id });
            }, 1100);
        },
        [],
    );

    const toggleSelect = useCallback((id: string) => {
        if (busyRef.current) return;
        dispatch({ type: "TOGGLE_SELECT", id });
        playSfx("select");
    }, []);

    const play = useCallback(async () => {
        const cur = stateRef.current;
        if (busyRef.current || cur.phase !== "playing") return;
        if (cur.selectedIds.length === 0) return;

        busyRef.current = true;

        // Selected cards, ordered as they sit in the hand.
        const selectedCards = cur.hand.filter((c) =>
            cur.selectedIds.includes(c.id),
        );
        const played: PlayedCard[] = selectedCards.map((card) => ({
            card,
            correct: isCorrect(cur.prompt, card),
            state: "pending",
        }));

        dispatch({ type: "BEGIN_PLAY", played });
        playSfx("play");
        await wait(STEP);

        // ── Buff context for this turn ──────────────────────────────────
        const buffs = cur.buffs;
        const hasInfinite = buffs.includes("infinite");
        const hasPhantom = buffs.includes("phantom");
        const hasFullCombo = buffs.includes("full_combo");
        const discardsUsed = cur.maxDiscards - cur.discardsLeft;
        // Mutable copy of run-level snowball state; committed at turn end.
        const run: BuffRunState = { ...cur.buffRunState };
        // Vô Cực carries the chain between turns; everyone else starts fresh.
        let chainCount = hasInfinite ? run.chainCount : 0;
        let chainMult = hasInfinite ? run.chainMult : 1;
        let phantomUsed = false;
        let validIndex = 0;
        // Last correct card's figures — Liên Hoàn replays them as bonus chains.
        let lastPoint = 0;
        let lastBaseMult = 0;
        let lastAnchorId = "";

        let turnScore = 0;

        for (const pc of played) {
            if (!mountedRef.current) {
                busyRef.current = false;
                return;
            }

            const { card, correct } = pc;

            if (!correct) {
                dispatch({ type: "SET_PLAYED_STATE", cardId: card.id, state: "fail" });
                emitFloat(card.id, "Trật!", "fail");
                playSfx("fail");
                // 幻 Ảo Ảnh: the first miss each turn spares the chain.
                if (hasPhantom && !phantomUsed && chainCount > 0) {
                    phantomUsed = true;
                    emitFloat(card.id, "Ảo Ảnh: giữ chuỗi", "buff");
                } else {
                    chainCount = 0;
                    chainMult = 1;
                }
                await wait(STEP);
                continue;
            }

            dispatch({ type: "SET_PLAYED_STATE", cardId: card.id, state: "success" });

            let point = 0;
            let mult = 0;
            const steps = buildScoreSteps(card, cur.prompt.level);

            for (const step of steps) {
                if (step.kind === "base") {
                    point = step.point ?? 0;
                    mult = step.mult ?? 1;
                    emitFloat(card.id, `${step.label} (${point} × ${mult})`, "base");
                } else if (step.point) {
                    point += step.point;
                    emitFloat(card.id, `${step.label} (+${step.point})`, "level");
                } else if (step.mult) {
                    mult += step.mult;
                    emitFloat(card.id, `${step.label} (+${step.mult} Mult)`, "level");
                }
                dispatch({ type: "SET_READOUT", readout: { point, mult, turnScore } });
                playSfx("correct");
                await wait(STEP);
            }

            // ── Buff adds (flat Point / Mult), before the chain ──────────
            const cardBuffs = applyCardBuffs(
                buffs,
                {
                    card,
                    level: cur.prompt.level,
                    validIndex,
                    chainCount,
                    discardsUsed,
                },
                run,
            );
            if (cardBuffs.floats.length > 0) {
                point += cardBuffs.addPoint;
                mult += cardBuffs.addMult;
                for (const f of cardBuffs.floats) {
                    emitFloat(card.id, `${f.label}: ${f.text}`, "buff");
                }
                playSfx("correct");
                dispatch({ type: "SET_READOUT", readout: { point, mult, turnScore } });
                await wait(STEP);
            }

            // Chain: from the 2nd consecutive correct card the mult compounds.
            if (chainCount >= 1) {
                chainMult *= GAME_CONFIG.chainDelta;
                emitFloat(
                    card.id,
                    `Chuỗi ${chainCount} (× ${trimMult(chainMult)})`,
                    "chain",
                );
                playSfx("chain");
                dispatch({
                    type: "SET_READOUT",
                    readout: { point, mult: Math.round(mult * chainMult), turnScore },
                });
                await wait(STEP);
            }
            chainCount += 1;

            let finalMult = Math.round(mult * chainMult);

            // ── Multiplicative final-mult buffs (天 Thiên Ngoại) ──────────
            const finalBuffs = applyFinalBuffs(buffs, cur.prompt.level, run);
            if (finalBuffs.mulFinal !== 1) {
                finalMult = Math.round(finalMult * finalBuffs.mulFinal);
                for (const f of finalBuffs.floats) {
                    emitFloat(card.id, `${f.label}: ${f.text}`, "buff");
                }
                playSfx("chain");
                dispatch({
                    type: "SET_READOUT",
                    readout: { point, mult: finalMult, turnScore },
                });
                await wait(STEP);
            }

            const cardScore = point * finalMult;
            turnScore += cardScore;
            lastPoint = point;
            lastBaseMult = mult;
            lastAnchorId = card.id;
            validIndex += 1;

            dispatch({
                type: "SET_READOUT",
                readout: { point, mult: finalMult, turnScore },
            });
            await wait(STEP);
        }

        // ── 連 Liên Hoàn: a flawless multi-card turn replays the last card
        // as two extra chain hits. ───────────────────────────────────────
        if (
            hasFullCombo &&
            played.length >= 2 &&
            played.every((p) => p.correct) &&
            lastAnchorId
        ) {
            for (let i = 0; i < 2 && mountedRef.current; i++) {
                chainMult *= GAME_CONFIG.chainDelta;
                chainCount += 1;
                const extraMult = Math.round(lastBaseMult * chainMult);
                turnScore += lastPoint * extraMult;
                emitFloat(
                    lastAnchorId,
                    `Liên Hoàn: Chuỗi ${chainCount - 1} (× ${trimMult(chainMult)})`,
                    "buff",
                );
                playSfx("chain");
                dispatch({
                    type: "SET_READOUT",
                    readout: { point: lastPoint, mult: extraMult, turnScore },
                });
                await wait(STEP);
            }
        }

        // Persist the chain for Vô Cực; otherwise it dies with the turn.
        if (hasInfinite) {
            run.chainCount = chainCount;
            run.chainMult = chainMult;
        } else {
            run.chainCount = 0;
            run.chainMult = 1;
        }

        // Hint penalty: if the player revealed the kanji this prompt, they keep
        // only a fraction of what they earned (no effect when turnScore is 0).
        if (cur.hintUsed && turnScore > 0) {
            const kept = Math.round(turnScore * GAME_CONFIG.hintPenalty);
            const lost = turnScore - kept;
            const anchorId =
                [...played].reverse().find((p) => p.correct)?.card.id ??
                played[0]?.card.id;
            if (anchorId && lost > 0) {
                emitFloat(anchorId, `Gợi ý −${lost}`, "penalty");
                playSfx("fail");
                dispatch({
                    type: "SET_READOUT",
                    readout: { point: 0, mult: 0, turnScore: kept },
                });
                await wait(STEP);
            }
            turnScore = kept;
        }

        await wait(STEP);
        if (!mountedRef.current) {
            busyRef.current = false;
            return;
        }

        const before = stateRef.current.score;
        dispatch({ type: "COMMIT_TURN", turnScore, buffRunState: run });

        // Resolve end-of-turn sounds from the *resulting* phase.
        if (before + turnScore >= stateRef.current.targetScore) {
            playSfx("chain");
        } else if (stateRef.current.turnsLeft - 1 <= 0) {
            playSfx("lose");
        }

        busyRef.current = false;
    }, [emitFloat]);

    const discard = useCallback(() => {
        const cur = stateRef.current;
        if (busyRef.current || cur.phase !== "playing") return;
        if (cur.selectedIds.length === 0 || cur.discardsLeft <= 0) return;
        dispatch({ type: "DISCARD", ids: cur.selectedIds });
        playSfx("play");
    }, []);

    const chooseBuff = useCallback((id: string) => {
        const cur = stateRef.current;
        if (cur.phase !== "roundClear") return;
        const willWin = cur.round + 1 > GAME_CONFIG.winRound;
        dispatch({ type: "CHOOSE_BUFF", id });
        playSfx(willWin ? "win" : "chain");
    }, []);

    const skipReward = useCallback(() => {
        const cur = stateRef.current;
        if (cur.phase !== "roundClear") return;
        const willWin = cur.round + 1 > GAME_CONFIG.winRound;
        dispatch({ type: "SKIP_REWARD" });
        playSfx(willWin ? "win" : "correct");
    }, []);

    const rerollReward = useCallback(() => {
        if (stateRef.current.rerollsLeft <= 0) return;
        dispatch({ type: "REROLL_REWARD" });
        playSfx("select");
    }, []);

    const useHint = useCallback(() => {
        if (busyRef.current || stateRef.current.phase !== "playing") return;
        if (stateRef.current.hintUsed) return;
        dispatch({ type: "USE_HINT" });
        playSfx("select");
    }, []);

    const newGame = useCallback(() => {
        busyRef.current = false;
        dispatch({ type: "NEW_GAME" });
    }, []);

    const progress = useMemo(
        () =>
            state.targetScore > 0
                ? Math.min(100, (state.score / state.targetScore) * 100)
                : 0,
        [state.score, state.targetScore],
    );

    const canPlay = state.phase === "playing" && state.selectedIds.length > 0;
    const canDiscard =
        state.phase === "playing" &&
        state.selectedIds.length > 0 &&
        state.discardsLeft > 0;
    const canHint = state.phase === "playing" && !state.hintUsed;

    return {
        state,
        progress,
        highScore,
        canPlay,
        canDiscard,
        canHint,
        isBusy: state.phase === "scoring",
        toggleSelect,
        play,
        discard,
        useHint,
        chooseBuff,
        skipReward,
        rerollReward,
        newGame,
    };
}
