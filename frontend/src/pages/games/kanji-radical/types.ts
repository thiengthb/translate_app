/**
 * Kanji Radical card game — domain types.
 *
 * Gameplay (inspired by the attached Godot vocab card game, re-themed for
 * Japanese): a Hán-Việt prompt word (kanji + hiragana) is shown in the
 * centre; the player throws out the radical (bộ thủ) cards that compose the
 * kanji. Correct radicals score `point × mult`; consecutive correct cards
 * build a chain multiplier — same scoring spirit as the reference game.
 *
 * The radical/prompt data here is a self-contained placeholder so the board
 * is playable today; swap `data.ts` for a backend feed later without
 * touching the engine or UI.
 */

export type JlptLevel = "N5" | "N4" | "N3" | "N2" | "N1";

/** A single radical (bộ thủ) the player can hold and throw. */
export interface RadicalCard {
    /** Stable id used for selection + answer matching. */
    id: string;
    /** The radical glyph, e.g. 木. */
    char: string;
    /** Hán-Việt name, e.g. "Mộc". */
    hanViet: string;
    /** Plain-language meaning, e.g. "cây / gỗ". */
    meaning: string;
    /** Stroke count — flavour shown on the card corner. */
    strokes: number;
}

/** The prompt word the player must decompose. */
export interface KanjiPrompt {
    id: string;
    /** Kanji surface form, e.g. 林 or 明. */
    kanji: string;
    /** Hiragana reading, e.g. はやし / めい. */
    hiragana: string;
    /** Hán-Việt reading, e.g. "Lâm". */
    hanViet: string;
    /** Vietnamese gloss, e.g. "rừng". */
    meaning: string;
    level: JlptLevel;
    /**
     * Radical ids that compose this kanji — the correct answers. A card is
     * scored as correct when its id appears here. (Listing the main/teaching
     * radicals is enough; it need not be a full Unicode IDS decomposition.)
     */
    radicalIds: string[];
}

export type GamePhase =
    | "playing" // waiting for the player to select + play / discard
    | "scoring" // animating the score resolution of a played turn
    | "roundClear" // hit the target — show the round-clear overlay
    | "gameOver" // ran out of turns below target
    | "victory"; // cleared the final round

/** Floating "+10 Point" / "x1.5 Mult" / "Trật!" text anchored to a card. */
export interface FloatingText {
    id: string;
    cardId: string;
    text: string;
    kind: "base" | "point" | "mult" | "chain" | "fail" | "level" | "penalty" | "buff";
}

/** Rarity tiers for buffs — drives reward odds + sell/UI colour. */
export type BuffRarity = "common" | "uncommon" | "rare" | "legendary";

/**
 * A "lá bùa" (charm) the player collects on clearing a round. Buffs modify
 * scoring permanently for the rest of the run — they are the power-growth
 * engine that lets the player keep pace with the escalating round targets
 * (mirrors the reference game's Item/relic system).
 */
export interface BuffDef {
    id: string;
    /** Single kanji/symbol shown on the charm face. */
    glyph: string;
    /** Display name (Vietnamese). */
    name: string;
    rarity: BuffRarity;
    /** One-line effect description (Vietnamese). */
    desc: string;
}

/**
 * Run-level mutable state that some buffs accumulate across turns/rounds
 * (e.g. Golden Ratio's snowballing point bonus, Over Heaven's growing mult,
 * and the chain carried between turns when Vô Cực is held).
 */
export interface BuffRunState {
    /** Golden Ratio: permanent +Point bonus, grows per valid card. */
    goldenBonus: number;
    /** Over Heaven: final-mult multiplier, grows per N1 kanji cleared. */
    overHeavenMult: number;
    /** Chain carried between turns (only used while "infinite" is held). */
    chainCount: number;
    chainMult: number;
}

/** A card that has been thrown to the centre play area this turn. */
export interface PlayedCard {
    card: RadicalCard;
    /** Was this radical part of the prompt kanji? */
    correct: boolean;
    /** Resolution state drives the highlight colour. */
    state: "pending" | "success" | "fail";
}

/** The running point × mult readout shown while a turn resolves. */
export interface ScoreReadout {
    point: number;
    mult: number;
    /** Score banked so far this turn (sum of resolved cards). */
    turnScore: number;
}

export interface GameState {
    phase: GamePhase;
    round: number;
    score: number;
    targetScore: number;
    turnsLeft: number;
    maxTurns: number;
    discardsLeft: number;
    maxDiscards: number;

    prompt: KanjiPrompt;
    hand: RadicalCard[];
    selectedIds: string[];

    /**
     * Whether the player revealed the kanji glyph for the current prompt via
     * the hint button. Resets each new prompt; while true the turn's earned
     * score is penalised (see GAME_CONFIG.hintPenalty).
     */
    hintUsed: boolean;

    /** Transient turn-resolution view-state. */
    played: PlayedCard[];
    floats: FloatingText[];
    readout: ScoreReadout;

    /** Cumulative points scored across the whole run (for the end screens). */
    runTotal: number;

    /** Owned buff ids, in pick order (capped at GAME_CONFIG.maxBuffs). */
    buffs: string[];
    /** Accumulating per-run state for snowball buffs. */
    buffRunState: BuffRunState;
    /** The 3 buff ids offered on the current round-clear screen. */
    rewardOptions: string[];
    /** Remaining reroll uses for the reward screen this run. */
    rerollsLeft: number;
}
