// Bảng màu/nhãn JLPT dùng chung giữa trang Từ điển, Sổ tay và Từ vựng tổng hợp.
// Trích ra file riêng để các trang cùng dùng, tránh định nghĩa trùng.
export const JLPT: Record<string, { badge: string; bar: string; accent: string; text: string }> = {
    N1: { badge: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
          bar: "bg-red-500", accent: "border-l-red-500", text: "text-red-600 dark:text-red-400" },
    N2: { badge: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
          bar: "bg-orange-500", accent: "border-l-orange-500", text: "text-orange-600 dark:text-orange-400" },
    N3: { badge: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
          bar: "bg-yellow-500", accent: "border-l-yellow-500", text: "text-yellow-700 dark:text-yellow-400" },
    N4: { badge: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30",
          bar: "bg-green-500", accent: "border-l-green-500", text: "text-green-600 dark:text-green-400" },
    N5: { badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
          bar: "bg-blue-500", accent: "border-l-blue-500", text: "text-blue-600 dark:text-blue-400" },
};

// Thứ tự level từ dễ → khó, dùng cho bộ lọc level ở trang Từ vựng tổng hợp.
export const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"] as const;

// Nhãn dạng chữ (representation) — dùng chung DictionaryPage & VocabularyBrowsePage.
export const REP_LABELS: Record<string, { label: string; className: string }> = {
    KANJI:    { label: "漢字", className: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30" },
    HIRAGANA: { label: "ひら", className: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30" },
    KATAKANA: { label: "カナ", className: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30" },
    MIXED:    { label: "混合", className: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30" },
};

// Nhãn loại từ (part of speech) — dùng chung DictionaryPage & VocabularyBrowsePage.
export const WORD_TYPE_LABELS: Record<string, string> = {
    n: "Danh từ", v1: "Động từ nhóm 2",
    v5: "Động từ nhóm 1", v5k: "Động từ nhóm 1", v5g: "Động từ nhóm 1",
    v5s: "Động từ nhóm 1", v5t: "Động từ nhóm 1", v5n: "Động từ nhóm 1",
    v5b: "Động từ nhóm 1", v5m: "Động từ nhóm 1", v5r: "Động từ nhóm 1",
    "adj-i": "Tính từ -い", "adj-na": "Tính từ -な",
    adv: "Phó từ", expr: "Thành ngữ", pref: "Tiền tố",
    suf: "Hậu tố", conj: "Liên từ", int: "Thán từ",
};