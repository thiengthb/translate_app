/**
 * Placeholder dataset for the Kanji Radical game.
 *
 * ⚠️ TEMPORARY DATA — the real bộ-thủ catalogue will be wired in later
 * (likely from the backend `word-kanjis` / a new radical resource). Keep
 * the shape identical to {@link RadicalCard} / {@link KanjiPrompt} so the
 * swap is a one-file change. Every `radicalIds` entry below references an id
 * that exists in `RADICALS`, and the chosen kanji are decomposable using
 * only radicals in that list so the board is always solvable.
 */
import type { KanjiPrompt, RadicalCard } from "./types";

export const RADICALS: RadicalCard[] = [
    { id: "nhan", char: "人", hanViet: "Nhân", meaning: "người", strokes: 2 },
    { id: "thuy", char: "水", hanViet: "Thuỷ", meaning: "nước", strokes: 4 },
    { id: "moc", char: "木", hanViet: "Mộc", meaning: "cây / gỗ", strokes: 4 },
    { id: "hoa", char: "火", hanViet: "Hoả", meaning: "lửa", strokes: 4 },
    { id: "nhat", char: "日", hanViet: "Nhật", meaning: "mặt trời / ngày", strokes: 4 },
    { id: "nguyet", char: "月", hanViet: "Nguyệt", meaning: "mặt trăng / tháng", strokes: 4 },
    { id: "khau", char: "口", hanViet: "Khẩu", meaning: "miệng", strokes: 3 },
    { id: "thu", char: "手", hanViet: "Thủ", meaning: "tay", strokes: 4 },
    { id: "tam", char: "心", hanViet: "Tâm", meaning: "tim / lòng", strokes: 4 },
    { id: "nu", char: "女", hanViet: "Nữ", meaning: "nữ giới", strokes: 3 },
    { id: "tu", char: "子", hanViet: "Tử", meaning: "con / trẻ", strokes: 3 },
    { id: "son", char: "山", hanViet: "Sơn", meaning: "núi", strokes: 3 },
    { id: "dien", char: "田", hanViet: "Điền", meaning: "ruộng", strokes: 5 },
    { id: "ngon", char: "言", hanViet: "Ngôn", meaning: "lời nói", strokes: 7 },
    { id: "kim", char: "金", hanViet: "Kim", meaning: "vàng / kim loại", strokes: 8 },
    { id: "tho", char: "土", hanViet: "Thổ", meaning: "đất", strokes: 3 },
    { id: "luc", char: "力", hanViet: "Lực", meaning: "sức mạnh", strokes: 2 },
    { id: "muc", char: "目", hanViet: "Mục", meaning: "mắt", strokes: 5 },
    { id: "thao", char: "艹", hanViet: "Thảo", meaning: "cỏ", strokes: 3 },
    { id: "vu", char: "雨", hanViet: "Vũ", meaning: "mưa", strokes: 8 },
    { id: "mon", char: "門", hanViet: "Môn", meaning: "cửa / cổng", strokes: 8 },
    { id: "thuc", char: "食", hanViet: "Thực", meaning: "ăn", strokes: 9 },
    { id: "thach", char: "石", hanViet: "Thạch", meaning: "đá", strokes: 5 },
    { id: "vuong", char: "王", hanViet: "Vương", meaning: "vua / ngọc", strokes: 4 },
    { id: "xa", char: "車", hanViet: "Xa", meaning: "xe", strokes: 7 },
    { id: "truc", char: "竹", hanViet: "Trúc", meaning: "tre", strokes: 6 },
];

export const PROMPTS: KanjiPrompt[] = [
    // ── N5 — clean two-radical compounds ──────────────────────────────────
    { id: "lam", kanji: "林", hiragana: "はやし", hanViet: "Lâm", meaning: "rừng (nhỏ)", level: "N5", radicalIds: ["moc"] },
    { id: "sam", kanji: "森", hiragana: "もり", hanViet: "Sâm", meaning: "rừng rậm", level: "N5", radicalIds: ["moc"] },
    { id: "minh", kanji: "明", hiragana: "めい", hanViet: "Minh", meaning: "sáng", level: "N5", radicalIds: ["nhat", "nguyet"] },
    { id: "hao", kanji: "好", hiragana: "こう", hanViet: "Hảo", meaning: "tốt / thích", level: "N5", radicalIds: ["nu", "tu"] },
    { id: "nam", kanji: "男", hiragana: "だん", hanViet: "Nam", meaning: "đàn ông", level: "N5", radicalIds: ["dien", "luc"] },
    { id: "huu", kanji: "休", hiragana: "きゅう", hanViet: "Hưu", meaning: "nghỉ ngơi", level: "N5", radicalIds: ["nhan", "moc"] },
    { id: "the", kanji: "体", hiragana: "たい", hanViet: "Thể", meaning: "cơ thể", level: "N5", radicalIds: ["nhan", "moc"] },
    { id: "hieu", kanji: "校", hiragana: "こう", hanViet: "Hiệu", meaning: "trường học", level: "N5", radicalIds: ["moc"] },
    { id: "hoc", kanji: "学", hiragana: "がく", hanViet: "Học", meaning: "học tập", level: "N5", radicalIds: ["tu"] },
    { id: "viem", kanji: "炎", hiragana: "えん", hanViet: "Viêm", meaning: "ngọn lửa / viêm", level: "N5", radicalIds: ["hoa"] },
    { id: "pham", kanji: "品", hiragana: "ひん", hanViet: "Phẩm", meaning: "phẩm / hàng hoá", level: "N5", radicalIds: ["khau"] },
    { id: "gian", kanji: "間", hiragana: "かん", hanViet: "Gian", meaning: "khoảng / giữa", level: "N5", radicalIds: ["mon", "nhat"] },
    { id: "van_hear", kanji: "聞", hiragana: "ぶん", hanViet: "Văn", meaning: "nghe", level: "N5", radicalIds: ["mon"] },

    // ── N4 — three radicals / less obvious ───────────────────────────────
    { id: "tu_think", kanji: "思", hiragana: "し", hanViet: "Tư", meaning: "suy nghĩ", level: "N4", radicalIds: ["dien", "tam"] },
    { id: "ngu", kanji: "語", hiragana: "ご", hanViet: "Ngữ", meaning: "ngôn ngữ", level: "N4", radicalIds: ["ngon", "khau"] },
    { id: "thoai", kanji: "話", hiragana: "わ", hanViet: "Thoại", meaning: "nói chuyện", level: "N4", radicalIds: ["ngon", "khau"] },
    { id: "hai", kanji: "海", hiragana: "かい", hanViet: "Hải", meaning: "biển", level: "N4", radicalIds: ["thuy"] },
    { id: "tri_hold", kanji: "持", hiragana: "じ", hanViet: "Trì", meaning: "cầm / giữ", level: "N4", radicalIds: ["thu", "tho"] },
    { id: "hoa_flower", kanji: "花", hiragana: "か", hanViet: "Hoa", meaning: "hoa", level: "N4", radicalIds: ["thao"] },
    { id: "thao_grass", kanji: "草", hiragana: "そう", hanViet: "Thảo", meaning: "cỏ", level: "N4", radicalIds: ["thao", "nhat"] },
    { id: "tuyet", kanji: "雪", hiragana: "せつ", hanViet: "Tuyết", meaning: "tuyết", level: "N4", radicalIds: ["vu"] },
    { id: "dien_elec", kanji: "電", hiragana: "でん", hanViet: "Điện", meaning: "điện", level: "N4", radicalIds: ["vu", "dien"] },
    { id: "van_cloud", kanji: "雲", hiragana: "うん", hanViet: "Vân", meaning: "mây", level: "N4", radicalIds: ["vu"] },
    { id: "am", kanji: "飲", hiragana: "いん", hanViet: "Ẩm", meaning: "uống", level: "N4", radicalIds: ["thuc"] },
    { id: "nham", kanji: "岩", hiragana: "がん", hanViet: "Nham", meaning: "nham thạch", level: "N4", radicalIds: ["son", "thach"] },

    // ── N3 — richer compounds ────────────────────────────────────────────
    { id: "tuong", kanji: "想", hiragana: "そう", hanViet: "Tưởng", meaning: "tưởng tượng", level: "N3", radicalIds: ["moc", "muc", "tam"] },
    { id: "ngan", kanji: "銀", hiragana: "ぎん", hanViet: "Ngân", meaning: "bạc", level: "N3", radicalIds: ["kim"] },
    { id: "dong", kanji: "銅", hiragana: "どう", hanViet: "Đồng", meaning: "đồng (kim loại)", level: "N3", radicalIds: ["kim"] },
    { id: "phan", kanji: "飯", hiragana: "はん", hanViet: "Phạn", meaning: "cơm", level: "N3", radicalIds: ["thuc"] },
    { id: "tinh", kanji: "性", hiragana: "せい", hanViet: "Tính", meaning: "tính chất / giới tính", level: "N3", radicalIds: ["tam"] },
    { id: "tho_road", kanji: "塁", hiragana: "るい", hanViet: "Luỹ", meaning: "luỹ / gò", level: "N3", radicalIds: ["dien", "tho"] },
];
