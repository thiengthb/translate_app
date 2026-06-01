/**
 * Pure game logic for the Kanji Radical game — no React, no side effects.
 *
 * Scoring mirrors the reference vocab game: each correct card contributes a
 * base `point × mult`, gets a JLPT-level bonus, and consecutive correct cards
 * compound a chain multiplier. The stateful chain itself is sequenced by the
 * React hook (`useKanjiGame`); everything here is deterministic given inputs.
 */
import { PROMPTS, RADICALS } from "./data";
import type {
    GameState,
    JlptLevel,
    KanjiPrompt,
    RadicalCard,
} from "./types";

export const GAME_CONFIG = {
    handSize: 8,
    maxSelect: 5,
    turnsPerRound: 5,
    discardsPerRound: 3,
    /** Clearing this round ends the run as a victory. */
    winRound: 8,
    /** Round-1 target; subsequent rounds scale by `targetGrowth`. */
    baseTarget: 300,
    targetGrowth: 1.4,
    basePoint: 50,
    baseMult: 1,
    /** From the 2nd consecutive correct card, mult ×= this each time. */
    chainDelta: 1.5,
} as const;

const LEVEL_BONUS: Record<JlptLevel, { point?: number; mult?: number }> = {
    N5: { point: 10 },
    N4: { point: 15 },
    N3: { point: 20 },
    N2: { mult: 2 },
    N1: { mult: 3 },
};

export const LEVEL_LABEL: Record<JlptLevel, string> = {
    N5: "Sơ cấp",
    N4: "Sơ–trung",
    N3: "Trung cấp",
    N2: "Cao–trung",
    N1: "Cao cấp",
};

/** Score target for a given (1-based) round. */
export function targetForRound(round: number): number {
    const raw =
        GAME_CONFIG.baseTarget * Math.pow(GAME_CONFIG.targetGrowth, round - 1);
    // Round to a tidy multiple of 10 so the goal reads cleanly.
    return Math.round(raw / 10) * 10;
}

/** Is this radical one of the prompt kanji's components? */
export function isCorrect(prompt: KanjiPrompt, card: RadicalCard): boolean {
    return prompt.radicalIds.includes(card.id);
}

export interface ScoreStep {
    kind: "base" | "point" | "mult" | "level";
    label: string;
    /** Point delta to add (for base this is the absolute base point). */
    point?: number;
    /** Mult delta / base mult. */
    mult?: number;
}

/**
 * Steps that resolve a single correct card, in animation order: the base
 * hit, then the level bonus. Chain is layered on top by the caller.
 */
export function buildScoreSteps(card: RadicalCard, level: JlptLevel): ScoreStep[] {
    void card;
    const steps: ScoreStep[] = [
        {
            kind: "base",
            label: "Bộ thủ đúng",
            point: GAME_CONFIG.basePoint,
            mult: GAME_CONFIG.baseMult,
        },
    ];

    const bonus = LEVEL_BONUS[level];
    if (bonus.point) {
        steps.push({ kind: "level", label: `Cấp ${level}`, point: bonus.point });
    }
    if (bonus.mult) {
        steps.push({ kind: "level", label: `Cấp ${level}`, mult: bonus.mult });
    }
    return steps;
}

function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const radicalById = new Map(RADICALS.map((r) => [r.id, r]));

/**
 * Build a hand that always contains the prompt's correct radicals (so the
 * round is solvable) plus random distractors, then shuffle. Mirrors the
 * reference `GenerateWords.generate` "relation words first, then fill".
 */
export function generateHand(
    prompt: KanjiPrompt,
    handSize = GAME_CONFIG.handSize,
): RadicalCard[] {
    const correct = [...new Set(prompt.radicalIds)]
        .map((id) => radicalById.get(id))
        .filter((c): c is RadicalCard => Boolean(c))
        .slice(0, handSize);

    const correctIds = new Set(correct.map((c) => c.id));
    const distractors = shuffle(
        RADICALS.filter((r) => !correctIds.has(r.id)),
    ).slice(0, Math.max(0, handSize - correct.length));

    return shuffle([...correct, ...distractors]);
}

/** Pick a random prompt, optionally excluding the current one. */
export function pickPrompt(excludeId?: string): KanjiPrompt {
    const pool = excludeId
        ? PROMPTS.filter((p) => p.id !== excludeId)
        : PROMPTS;
    const source = pool.length > 0 ? pool : PROMPTS;
    return source[Math.floor(Math.random() * source.length)];
}

export function createInitialState(): GameState {
    const prompt = pickPrompt();
    return {
        phase: "playing",
        round: 1,
        score: 0,
        targetScore: targetForRound(1),
        turnsLeft: GAME_CONFIG.turnsPerRound,
        maxTurns: GAME_CONFIG.turnsPerRound,
        discardsLeft: GAME_CONFIG.discardsPerRound,
        maxDiscards: GAME_CONFIG.discardsPerRound,
        prompt,
        hand: generateHand(prompt),
        selectedIds: [],
        played: [],
        floats: [],
        readout: { point: 0, mult: 0, turnScore: 0 },
        runTotal: 0,
    };
}

/** Compact big numbers (e.g. 12.3K) for the score readouts. */
export function formatNumber(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
    if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    return String(Math.round(n));
}
