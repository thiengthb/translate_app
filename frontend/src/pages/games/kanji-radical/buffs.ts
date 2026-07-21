/**
 * Buff ("lá bùa") catalogue + pure scoring effects for the Kanji Radical game.
 *
 * Inspired by the attached Godot vocab game's Item/relic system: clearing a
 * round opens a reward screen offering rarity-weighted charms. A charm is a
 * permanent run modifier that hooks into the per-card scoring pipeline. This
 * file is pure (no React, no side effects) so the numbers are easy to reason
 * about and tune.
 *
 * ── BALANCE MODEL ────────────────────────────────────────────────────────
 * Round targets grow ×`targetGrowth` each round (see engine.ts). A single
 * buff is budgeted to roughly offset ONE round of that growth, so picking one
 * charm per clear keeps the player on the power curve:
 *
 *   • common      ≈ +20–40% to a typical turn   (steady, always-on adds)
 *   • uncommon    ≈ +40–70%                       (conditional / snowballing)
 *   • rare        ≈ economy / chain swings        (turns, chain protection)
 *   • legendary   ≈ run-defining multiplier       (×mult, infinite chain)
 *
 * Drop odds + sell values are lifted directly from the reference game.
 */
import type {
    BuffDef,
    BuffRarity,
    BuffRunState,
    JlptLevel,
    RadicalCard,
} from "./types";

/** Hard cap on how many charms the player can hold (reference uses 5 slots). */
export const MAX_BUFFS = 5;

/** Rerolls granted per run on the reward screen. */
export const REROLLS_PER_RUN = 3;

/** Relative pick odds per rarity (reference REWARD_RARITY_WEIGHTS). */
export const RARITY_WEIGHT: Record<BuffRarity, number> = {
    common: 62,
    uncommon: 29,
    rare: 8,
    legendary: 1,
};

/** UI accent + label per rarity. */
export const RARITY_META: Record<
    BuffRarity,
    { label: string; ring: string; text: string; glow: string }
> = {
    common: {
        label: "Thường",
        ring: "ring-slate-400/50",
        text: "text-slate-600",
        glow: "from-slate-400/20",
    },
    uncommon: {
        label: "Hiếm",
        ring: "ring-emerald-400/60",
        text: "text-emerald-600",
        glow: "from-emerald-400/25",
    },
    rare: {
        label: "Quý",
        ring: "ring-sky-400/60",
        text: "text-sky-600",
        glow: "from-sky-400/25",
    },
    legendary: {
        label: "Huyền thoại",
        ring: "ring-amber-400/70",
        text: "text-amber-600",
        glow: "from-amber-400/30",
    },
};

/**
 * The charm catalogue. Each maps to a reference Item, re-themed for kanji
 * radicals. Tuning constants live inline next to the effect that reads them
 * (see {@link applyCardBuffs} / the orchestrator).
 */
export const BUFFS: Record<string, BuffDef> = {
    // ── COMMON ──────────────────────────────────────────────────────────
    inkbrush: {
        id: "inkbrush",
        glyph: "墨",
        name: "Nghiên Mực",
        rarity: "common",
        desc: "Mỗi bộ thủ đúng được +15 Điểm.",
    },
    talisman: {
        id: "talisman",
        glyph: "呪",
        name: "Lá Bùa",
        rarity: "common",
        desc: "Mỗi bộ thủ đúng được +1 Mult.",
    },
    calligraphy: {
        id: "calligraphy",
        glyph: "画",
        name: "Thư Pháp",
        rarity: "common",
        desc: "Bộ thủ từ 7 nét trở lên: +35 Điểm.",
    },
    morning_tea: {
        id: "morning_tea",
        glyph: "茶",
        name: "Trà Sáng",
        rarity: "common",
        desc: "Bộ thủ đúng ĐẦU TIÊN mỗi lượt: +80 Điểm.",
    },
    beginner_mind: {
        id: "beginner_mind",
        glyph: "初",
        name: "Sơ Tâm",
        rarity: "common",
        desc: "Chữ N5 hoặc N4: mỗi bộ thủ +25 Điểm.",
    },

    // ── UNCOMMON ────────────────────────────────────────────────────────
    golden_ratio: {
        id: "golden_ratio",
        glyph: "金",
        name: "Tỷ Lệ Vàng",
        rarity: "uncommon",
        desc: "Mỗi bộ thủ đúng tăng vĩnh viễn +3 Điểm thưởng (cộng dồn cả ván).",
    },
    scholar: {
        id: "scholar",
        glyph: "賢",
        name: "Học Giả",
        rarity: "uncommon",
        desc: "Chữ N2 hoặc N1: mỗi bộ thủ +2 Mult.",
    },
    resonance: {
        id: "resonance",
        glyph: "響",
        name: "Cộng Hưởng",
        rarity: "uncommon",
        desc: "Khi chuỗi combo đang ≥ 2: +45 Điểm.",
    },
    focus: {
        id: "focus",
        glyph: "念",
        name: "Chuyên Tâm",
        rarity: "uncommon",
        desc: "Bộ thủ đúng đầu tiên mỗi lượt: +3 Mult.",
    },
    future_debt: {
        id: "future_debt",
        glyph: "借",
        name: "Mượn Tương Lai",
        rarity: "uncommon",
        desc: "Bộ thủ đúng đầu tiên mỗi lượt: +30 Điểm cho mỗi lần Bỏ bài đã dùng vòng này.",
    },

    // ── RARE ────────────────────────────────────────────────────────────
    full_combo: {
        id: "full_combo",
        glyph: "連",
        name: "Liên Hoàn",
        rarity: "rare",
        desc: "Nếu đánh ≥ 2 lá và TẤT CẢ đều đúng: lá cuối nối thêm 2 nấc chuỗi.",
    },
    pocket: {
        id: "pocket",
        glyph: "袋",
        name: "Túi Thần Kỳ",
        rarity: "rare",
        desc: "+1 Lượt mỗi vòng cho mỗi 2 lá bùa khác bạn đang giữ.",
    },
    phantom: {
        id: "phantom",
        glyph: "幻",
        name: "Ảo Ảnh",
        rarity: "rare",
        desc: "Lá SAI đầu tiên mỗi lượt không làm đứt chuỗi.",
    },

    // ── LEGENDARY ───────────────────────────────────────────────────────
    over_heaven: {
        id: "over_heaven",
        glyph: "天",
        name: "Thiên Ngoại",
        rarity: "legendary",
        desc: "×2 Mult cuối. Mỗi chữ N1 đánh đúng tăng vĩnh viễn +0.25.",
    },
    infinite: {
        id: "infinite",
        glyph: "∞",
        name: "Vô Cực",
        rarity: "legendary",
        desc: "Chuỗi combo không reset mỗi lượt — chỉ đứt khi bạn đánh sai.",
    },
};

/** Stable list (insertion order) used by the tray + reward roll. */
export const ALL_BUFF_IDS = Object.keys(BUFFS);

export function getBuff(id: string): BuffDef | undefined {
    return BUFFS[id];
}

/** Sell/relative value of a rarity (reference get_rarity_value). */
export function rarityValue(rarity: BuffRarity): number {
    switch (rarity) {
        case "common":
            return 1;
        case "uncommon":
            return 2;
        case "rare":
            return 5;
        case "legendary":
            return 10;
    }
}

/**
 * Roll `count` distinct reward charms, weighted by rarity and excluding any
 * the player already owns. Mirrors `ItemDB.get_random_rewards`.
 */
export function rollRewards(count: number, ownedIds: string[]): string[] {
    const excluded = new Set(ownedIds);
    const chosen: string[] = [];

    for (let i = 0; i < count; i++) {
        const pool = ALL_BUFF_IDS.filter(
            (id) => !excluded.has(id) && !chosen.includes(id),
        );
        if (pool.length === 0) break;

        // Weighted roll over the pool's rarities.
        const totalWeight = pool.reduce(
            (sum, id) => sum + RARITY_WEIGHT[BUFFS[id].rarity],
            0,
        );
        let roll = Math.random() * totalWeight;
        let picked = pool[pool.length - 1];
        for (const id of pool) {
            roll -= RARITY_WEIGHT[BUFFS[id].rarity];
            if (roll < 0) {
                picked = id;
                break;
            }
        }
        chosen.push(picked);
    }
    return chosen;
}

/** Extra turns granted at round start by the Túi Thần Kỳ charm. */
export function roundTurnBonus(buffs: string[]): number {
    if (!buffs.includes("pocket")) return 0;
    // +1 turn per 2 OTHER charms held (reference: half total rarity value).
    const others = buffs.filter((id) => id !== "pocket").length;
    return Math.floor(others / 2);
}

/** A single buff contribution surfaced as a floating label during scoring. */
export interface BuffFloat {
    /** Buff name, used for the float text. */
    label: string;
    text: string;
}

/** Context for resolving one correct card's buff effects. */
export interface CardBuffContext {
    card: RadicalCard;
    level: JlptLevel;
    /** 0-based index among VALID cards already resolved this turn. */
    validIndex: number;
    /** Chain count BEFORE this card resolves. */
    chainCount: number;
    /** Discards spent so far this round. */
    discardsUsed: number;
}

export interface CardBuffResult {
    addPoint: number;
    addMult: number;
    floats: BuffFloat[];
}

/**
 * Apply all owned buffs that add flat Point / Mult to a single CORRECT card,
 * BEFORE the chain multiplier is applied. Snowball state (Golden Ratio) is
 * mutated in place on `run` so it persists for the rest of the run.
 *
 * Order mirrors the reference: level/base already applied by the caller; this
 * layers relic adds on top, then chain, then the final-mult multipliers
 * (see {@link applyFinalBuffs}).
 */
export function applyCardBuffs(
    buffs: string[],
    ctx: CardBuffContext,
    run: BuffRunState,
): CardBuffResult {
    let addPoint = 0;
    let addMult = 0;
    const floats: BuffFloat[] = [];

    const has = (id: string) => buffs.includes(id);
    const add = (def: BuffDef, text: string) =>
        floats.push({ label: def.name, text });

    // 墨 Nghiên Mực — flat +Point every correct card.
    if (has("inkbrush")) {
        addPoint += 15;
        add(BUFFS.inkbrush, "+15 Điểm");
    }

    // 呪 Lá Bùa — flat +Mult every correct card.
    if (has("talisman")) {
        addMult += 1;
        add(BUFFS.talisman, "+1 Mult");
    }

    // 画 Thư Pháp — reward visually complex radicals (≥7 strokes).
    if (has("calligraphy") && ctx.card.strokes >= 7) {
        addPoint += 35;
        add(BUFFS.calligraphy, "+35 Điểm");
    }

    // 初 Sơ Tâm — help the easy levels.
    if (has("beginner_mind") && (ctx.level === "N5" || ctx.level === "N4")) {
        addPoint += 25;
        add(BUFFS.beginner_mind, "+25 Điểm");
    }

    // 賢 Học Giả — pay off the hard levels.
    if (has("scholar") && (ctx.level === "N2" || ctx.level === "N1")) {
        addMult += 2;
        add(BUFFS.scholar, "+2 Mult");
    }

    // 響 Cộng Hưởng — reward keeping a chain alive.
    if (has("resonance") && ctx.chainCount >= 2) {
        addPoint += 45;
        add(BUFFS.resonance, "+45 Điểm");
    }

    // First-correct-of-turn effects.
    if (ctx.validIndex === 0) {
        // 茶 Trà Sáng — flat burst on the opener.
        if (has("morning_tea")) {
            addPoint += 80;
            add(BUFFS.morning_tea, "+80 Điểm");
        }
        // 念 Chuyên Tâm — mult burst on the opener.
        if (has("focus")) {
            addMult += 3;
            add(BUFFS.focus, "+3 Mult");
        }
        // 借 Mượn Tương Lai — pays back discards spent this round.
        if (has("future_debt") && ctx.discardsUsed > 0) {
            const bonus = ctx.discardsUsed * 30;
            addPoint += bonus;
            add(BUFFS.future_debt, `+${bonus} Điểm`);
        }
    }

    // 金 Tỷ Lệ Vàng — snowballing permanent point bonus (stack THEN apply,
    // matching the reference so the first valid card already benefits).
    if (has("golden_ratio")) {
        run.goldenBonus += 3;
        addPoint += run.goldenBonus;
        add(BUFFS.golden_ratio, `+${run.goldenBonus} Điểm`);
    }

    return { addPoint, addMult, floats };
}

export interface FinalBuffResult {
    /** Multiplier to apply to the (already chained, rounded) final mult. */
    mulFinal: number;
    floats: BuffFloat[];
}

/**
 * Apply multiplicative final-mult buffs AFTER the chain has been folded in.
 * Currently only Over Heaven; its multiplier snowballs on N1 kanji.
 */
export function applyFinalBuffs(
    buffs: string[],
    level: JlptLevel,
    run: BuffRunState,
): FinalBuffResult {
    const floats: BuffFloat[] = [];
    let mulFinal = 1;

    if (buffs.includes("over_heaven")) {
        mulFinal *= run.overHeavenMult;
        floats.push({
            label: BUFFS.over_heaven.name,
            text: `× ${trimMult(run.overHeavenMult)} Mult`,
        });
        if (level === "N1") {
            run.overHeavenMult += 0.25;
        }
    }

    return { mulFinal, floats };
}

/** Render a float-friendly multiplier (drops trailing zeros: 2 not 2.00). */
export function trimMult(value: number): string {
    return value.toFixed(2).replace(/\.?0+$/, "");
}
