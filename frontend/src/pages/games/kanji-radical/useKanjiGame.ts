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
import { RADICALS } from "./data";
import { playSfx } from "./sound";
import type {
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
    | { type: "BEGIN_PLAY"; played: PlayedCard[] }
    | { type: "SET_READOUT"; readout: ScoreReadout }
    | { type: "SET_PLAYED_STATE"; cardId: string; state: PlayedCard["state"] }
    | { type: "ADD_FLOAT"; float: FloatingText }
    | { type: "REMOVE_FLOAT"; id: string }
    | { type: "COMMIT_TURN"; turnScore: number }
    | { type: "DISCARD"; ids: string[] }
    | { type: "NEXT_ROUND" }
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

            if (score >= state.targetScore) {
                return {
                    ...state,
                    phase: "roundClear",
                    score,
                    runTotal,
                    turnsLeft,
                    played: [],
                    floats: [],
                    readout: { point: 0, mult: 0, turnScore: action.turnScore },
                };
            }
            if (turnsLeft <= 0) {
                return {
                    ...state,
                    phase: "gameOver",
                    score,
                    runTotal,
                    turnsLeft,
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
                prompt,
                hand: generateHand(prompt),
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

        case "NEXT_ROUND": {
            const carry = Math.max(0, state.score - state.targetScore);
            const nextRound = state.round + 1;
            if (nextRound > GAME_CONFIG.winRound) {
                return { ...state, phase: "victory", round: nextRound };
            }
            const prompt = pickPrompt(state.prompt.id);
            return {
                ...state,
                phase: "playing",
                round: nextRound,
                targetScore: targetForRound(nextRound),
                score: carry,
                turnsLeft: state.maxTurns,
                discardsLeft: state.maxDiscards,
                prompt,
                hand: generateHand(prompt),
                played: [],
                floats: [],
                readout: { point: 0, mult: 0, turnScore: 0 },
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
    isBusy: boolean;
    toggleSelect: (id: string) => void;
    play: () => void;
    discard: () => void;
    nextRound: () => void;
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

        let turnScore = 0;
        let chainCount = 0;
        let chainMult = 1;

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
                chainCount = 0;
                chainMult = 1;
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

            // Chain: from the 2nd consecutive correct card the mult compounds.
            if (chainCount >= 1) {
                chainMult *= GAME_CONFIG.chainDelta;
                emitFloat(
                    card.id,
                    `Chuỗi ${chainCount} (× ${chainMult.toFixed(2).replace(/\.?0+$/, "")})`,
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

            const finalMult = Math.round(mult * chainMult);
            const cardScore = point * finalMult;
            turnScore += cardScore;

            dispatch({
                type: "SET_READOUT",
                readout: { point, mult: finalMult, turnScore },
            });
            await wait(STEP);
        }

        await wait(STEP);
        if (!mountedRef.current) {
            busyRef.current = false;
            return;
        }

        const before = stateRef.current.score;
        dispatch({ type: "COMMIT_TURN", turnScore });

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

    const nextRound = useCallback(() => {
        const cur = stateRef.current;
        const willWin = cur.round + 1 > GAME_CONFIG.winRound;
        dispatch({ type: "NEXT_ROUND" });
        playSfx(willWin ? "win" : "correct");
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

    return {
        state,
        progress,
        highScore,
        canPlay,
        canDiscard,
        isBusy: state.phase === "scoring",
        toggleSelect,
        play,
        discard,
        nextRound,
        newGame,
    };
}
