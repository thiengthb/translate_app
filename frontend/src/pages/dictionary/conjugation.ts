// ══════════════════════════════════════════════════════════════════════
// Engine chia động từ / tính từ tiếng Nhật — thuần rule, không cần dữ liệu.
//
// Đầu vào chỉ cần (word, reading, wordType) — đều có sẵn trong WordSearchResult.
// Phần đuôi biến đổi (okurigana) là kana cuối, giống nhau ở cả dạng kanji
// (word) lẫn kana (reading), nên hầu hết các lớp chỉ cần cắt/ghép đuôi một
// lần rồi áp y hệt cho cả hai → trả về cặp { surface, kana } để feed thẳng
// FuriganaText. Riêng 来る (kuri) đổi cả thân đọc (く/き/こ) nên hardcode.
//
// Mã wordType theo chuẩn JMdict: v1 (ichidan/nhóm 2), v5* (godan/nhóm 1 theo
// phụ âm cuối), vs/vs-i (する), vk (来る), adj-i, adj-na.
// ══════════════════════════════════════════════════════════════════════

export interface ConjForm {
    /** Dạng hiển thị (kanji-mixed). */
    surface: string;
    /** Dạng kana thuần — dùng làm furigana / TTS. */
    kana: string;
}

export interface ConjRow {
    name: string;
    plain?: ConjForm;
    polite?: ConjForm;
}

export interface ConjGroup {
    title: string;
    rows: ConjRow[];
}

export interface ConjugationResult {
    /** Nhãn loại từ tiếng Việt, vd "Động từ nhóm 1 (godan)". */
    classLabel: string;
    groups: ConjGroup[];
}

type VerbClass =
    | "ichidan" | "godan" | "suru" | "kuru" | "adj-i" | "adj-na" | null;

// ── Bảng hàng âm cho động từ godan (theo kana cuối) ────────────────────
// a = thân phủ định/受身/使役 · i = thân ます · e = khả năng/điều kiện/命令
// o = ý chí · te/ta = đuôi て/た đã áp biến âm (音便).
interface GodanRow { a: string; i: string; e: string; o: string; te: string; ta: string; }

const GODAN: Record<string, GodanRow> = {
    "う": { a: "わ", i: "い", e: "え", o: "お", te: "って", ta: "った" },
    "く": { a: "か", i: "き", e: "け", o: "こ", te: "いて", ta: "いた" },
    "ぐ": { a: "が", i: "ぎ", e: "げ", o: "ご", te: "いで", ta: "いだ" },
    "す": { a: "さ", i: "し", e: "せ", o: "そ", te: "して", ta: "した" },
    "つ": { a: "た", i: "ち", e: "て", o: "と", te: "って", ta: "った" },
    "ぬ": { a: "な", i: "に", e: "ね", o: "の", te: "んで", ta: "んだ" },
    "ぶ": { a: "ば", i: "び", e: "べ", o: "ぼ", te: "んで", ta: "んだ" },
    "む": { a: "ま", i: "み", e: "め", o: "も", te: "んで", ta: "んだ" },
    "る": { a: "ら", i: "り", e: "れ", o: "ろ", te: "って", ta: "った" },
};

// Số ít động từ đuôi 〜う giữ nguyên âm う ở thể て/た (問うて, không phải 問って).
const U_EUPHONIC = new Set(["問う", "請う", "乞う", "厭う", "訪う"]);

// ── Nhận diện loại từ — ưu tiên mã, fallback theo bề mặt cho dữ liệu thiếu ──
function detectClass(word: string, reading: string, wordType: string): VerbClass {
    const t = (wordType || "").toLowerCase().trim();

    if (t === "adj-i" || t === "adj-ix") return "adj-i";
    if (t === "adj-na") return "adj-na";
    if (t === "v1" || t === "v1-s" || t === "vz") return "ichidan";
    if (t.startsWith("v5")) return "godan";
    if (t === "vk" || word === "来る" || word === "來る" || reading === "くる") return "kuru";
    if (t === "vs" || t === "vs-i" || t === "vs-s" || t.startsWith("vs"))
        return "suru";

    // Fallback theo bề mặt khi không có / không nhận ra mã.
    if (reading.endsWith("する")) return "suru";
    if (reading === "くる" || word === "来る") return "kuru";
    // Lưu ý: không đoán godan/ichidan/adj-i chỉ từ đuôi 〜る/〜い vì dễ sai
    // (danh từ kết thúc bằng い…). Thiếu mã → không chia (an toàn).
    return null;
}

// Áp cùng một đuôi cho thân kanji và thân kana.
function pair(surfaceStem: string, kanaStem: string, ending: string): ConjForm {
    return { surface: surfaceStem + ending, kana: kanaStem + ending };
}

// ── Động từ godan (nhóm 1) ─────────────────────────────────────────────
function conjugateGodan(word: string, reading: string): ConjGroup[] | null {
    const last = reading.slice(-1);
    let m = GODAN[last];
    if (!m) return null;

    // 行く / 〜いく / 〜ゆく (逝く, 往く): biến âm て đặc cách (って, không phải いて).
    if (reading.endsWith("いく") || reading.endsWith("ゆく")) m = { ...m, te: "って", ta: "った" };
    // Ngoại lệ 〜う giữ âm う ở thể て/た (問う→問うて).
    else if (last === "う" && U_EUPHONIC.has(word)) m = { ...m, te: "うて", ta: "うた" };

    const sStem = word.slice(0, -1);
    const kStem = reading.slice(0, -1);
    const mk = (e: string) => pair(sStem, kStem, e);

    // ある: phủ định bất quy tắc (ない / なかった), bỏ cả thân あ.
    const isAru = reading === "ある";
    const negStemS = isAru ? word.slice(0, -2) : sStem + m.a;
    const negStemK = isAru ? reading.slice(0, -2) : kStem + m.a;
    const neg = (e: string) => ({ surface: negStemS + e, kana: negStemK + e });

    return verbGroups({
        presPlainAff: { surface: word, kana: reading },
        presPolAff: mk(m.i + "ます"),
        presPlainNeg: neg("ない"),
        presPolNeg: mk(m.i + "ません"),
        pastPlainAff: mk(m.ta),
        pastPolAff: mk(m.i + "ました"),
        pastPlainNeg: neg("なかった"),
        pastPolNeg: mk(m.i + "ませんでした"),
        te: mk(m.te),
        condBa: mk(m.e + "ば"),
        condTara: mk(m.ta + "ら"),
        potPlain: mk(m.e + "る"),
        potPol: mk(m.e + "ます"),
        pasPlain: mk(m.a + "れる"),
        pasPol: mk(m.a + "れます"),
        cauPlain: mk(m.a + "せる"),
        cauPol: mk(m.a + "せます"),
        cauPas: mk(m.a + "せられる"),
        imper: mk(m.e),
        volPlain: mk(m.o + "う"),
        volPol: mk(m.i + "ましょう"),
    });
}

// ── Động từ ichidan (nhóm 2) ───────────────────────────────────────────
function conjugateIchidan(word: string, reading: string): ConjGroup[] {
    const sStem = word.slice(0, -1);   // bỏ る
    const kStem = reading.slice(0, -1);
    const mk = (e: string) => pair(sStem, kStem, e);

    return verbGroups({
        presPlainAff: { surface: word, kana: reading },
        presPolAff: mk("ます"),
        presPlainNeg: mk("ない"),
        presPolNeg: mk("ません"),
        pastPlainAff: mk("た"),
        pastPolAff: mk("ました"),
        pastPlainNeg: mk("なかった"),
        pastPolNeg: mk("ませんでした"),
        te: mk("て"),
        condBa: mk("れば"),
        condTara: mk("たら"),
        potPlain: mk("られる"),
        potPol: mk("られます"),
        pasPlain: mk("られる"),
        pasPol: mk("られます"),
        cauPlain: mk("させる"),
        cauPol: mk("させます"),
        cauPas: mk("させられる"),
        imper: mk("ろ"),
        volPlain: mk("よう"),
        volPol: mk("ましょう"),
    });
}

// ── Động từ する (gồm 〜する và danh từ + する) ─────────────────────────
function conjugateSuru(word: string, reading: string): ConjGroup[] {
    // Tách phần đứng trước する. Nếu là danh từ vs (vd 勉強, べんきょう) chưa
    // có する thì giữ nguyên làm tiền tố, gốc hiển thị thêm する.
    const hasSuru = reading.endsWith("する");
    const preS = hasSuru ? word.slice(0, -2) : word;
    const preK = hasSuru ? reading.slice(0, -2) : reading;
    const mk = (e: string) => pair(preS, preK, e);

    return verbGroups({
        presPlainAff: mk("する"),
        presPolAff: mk("します"),
        presPlainNeg: mk("しない"),
        presPolNeg: mk("しません"),
        pastPlainAff: mk("した"),
        pastPolAff: mk("しました"),
        pastPlainNeg: mk("しなかった"),
        pastPolNeg: mk("しませんでした"),
        te: mk("して"),
        condBa: mk("すれば"),
        condTara: mk("したら"),
        potPlain: mk("できる"),
        potPol: mk("できます"),
        pasPlain: mk("される"),
        pasPol: mk("されます"),
        cauPlain: mk("させる"),
        cauPol: mk("させます"),
        cauPas: mk("させられる"),
        imper: mk("しろ"),
        volPlain: mk("しよう"),
        volPol: mk("しましょう"),
    });
}

// ── Động từ 来る (bất quy tắc — đổi cả thân đọc く/き/こ) ────────────────
function conjugateKuru(word: string): ConjGroup[] {
    const kanji = word.includes("来") || word.includes("來");
    const base = word.includes("來") ? "來" : "来";
    // f(surfaceTail dùng khi viết kanji, kanaForm) → ConjForm.
    const f = (kanjiTail: string, kana: string): ConjForm =>
        ({ surface: kanji ? base + kanjiTail : kana, kana });

    return verbGroups({
        presPlainAff: f("る", "くる"),
        presPolAff: f("ます", "きます"),
        presPlainNeg: f("ない", "こない"),
        presPolNeg: f("ません", "きません"),
        pastPlainAff: f("た", "きた"),
        pastPolAff: f("ました", "きました"),
        pastPlainNeg: f("なかった", "こなかった"),
        pastPolNeg: f("ませんでした", "きませんでした"),
        te: f("て", "きて"),
        condBa: f("れば", "くれば"),
        condTara: f("たら", "きたら"),
        potPlain: f("られる", "こられる"),
        potPol: f("られます", "こられます"),
        pasPlain: f("られる", "こられる"),
        pasPol: f("られます", "こられます"),
        cauPlain: f("させる", "こさせる"),
        cauPol: f("させます", "こさせます"),
        cauPas: f("させられる", "こさせられる"),
        imper: f("い", "こい"),
        volPlain: f("よう", "こよう"),
        volPol: f("ましょう", "きましょう"),
    });
}

// Gom các dạng động từ vào nhóm hiển thị (dùng chung cho mọi lớp động từ).
function verbGroups(v: {
    presPlainAff: ConjForm; presPolAff: ConjForm; presPlainNeg: ConjForm; presPolNeg: ConjForm;
    pastPlainAff: ConjForm; pastPolAff: ConjForm; pastPlainNeg: ConjForm; pastPolNeg: ConjForm;
    te: ConjForm; condBa: ConjForm; condTara: ConjForm;
    potPlain: ConjForm; potPol: ConjForm; pasPlain: ConjForm; pasPol: ConjForm;
    cauPlain: ConjForm; cauPol: ConjForm; cauPas: ConjForm;
    imper: ConjForm; volPlain: ConjForm; volPol: ConjForm;
}): ConjGroup[] {
    return [
        {
            title: "Thể cơ bản",
            rows: [
                { name: "Hiện tại（肯定）", plain: v.presPlainAff, polite: v.presPolAff },
                { name: "Hiện tại（否定）", plain: v.presPlainNeg, polite: v.presPolNeg },
                { name: "Quá khứ（肯定）", plain: v.pastPlainAff, polite: v.pastPolAff },
                { name: "Quá khứ（否定）", plain: v.pastPlainNeg, polite: v.pastPolNeg },
            ],
        },
        {
            title: "Te・Điều kiện",
            rows: [
                { name: "Te形（て）", plain: v.te },
                { name: "Điều kiện（ば）", plain: v.condBa },
                { name: "Điều kiện（たら）", plain: v.condTara },
            ],
        },
        {
            title: "Khả năng・Bị động・Sai khiến",
            rows: [
                { name: "Khả năng（可能）", plain: v.potPlain, polite: v.potPol },
                { name: "Bị động（受身）", plain: v.pasPlain, polite: v.pasPol },
                { name: "Sai khiến（使役）", plain: v.cauPlain, polite: v.cauPol },
                { name: "Sai khiến-bị động（使役受身）", plain: v.cauPas },
            ],
        },
        {
            title: "Mệnh lệnh・Ý chí",
            rows: [
                { name: "Mệnh lệnh（命令）", plain: v.imper },
                { name: "Ý chí（意向）", plain: v.volPlain, polite: v.volPol },
            ],
        },
    ];
}

// ── Tính từ đuôi -い ───────────────────────────────────────────────────
function conjugateAdjI(word: string, reading: string): ConjGroup[] {
    // いい / 〜いい: bất quy tắc, thân chuyển thành よ (よかった, よくない…).
    // 良い・よい conjugate đều như thường (よ + くない) nên không cần đặc cách.
    const ii = reading.endsWith("いい");
    const sStem = ii ? word.slice(0, -2) + "よ" : word.slice(0, -1);
    const kStem = ii ? reading.slice(0, -2) + "よ" : reading.slice(0, -1);
    const mk = (e: string) => pair(sStem, kStem, e);

    return [
        {
            title: "Thể cơ bản",
            rows: [
                {
                    name: "Hiện tại（肯定）",
                    plain: { surface: word, kana: reading },
                    polite: { surface: word + "です", kana: reading + "です" },
                },
                { name: "Hiện tại（否定）", plain: mk("くない"), polite: mk("くありません") },
                { name: "Quá khứ（肯定）", plain: mk("かった"), polite: mk("かったです") },
                { name: "Quá khứ（否定）", plain: mk("くなかった"), polite: mk("くありませんでした") },
            ],
        },
        {
            title: "Liên dụng・Điều kiện",
            rows: [
                { name: "Te形（くて）", plain: mk("くて") },
                { name: "Liên dụng（副詞化）", plain: mk("く") },
                { name: "Điều kiện（ば）", plain: mk("ければ") },
                { name: "Điều kiện（たら）", plain: mk("かったら") },
            ],
        },
    ];
}

// ── Tính từ đuôi -な ───────────────────────────────────────────────────
function conjugateAdjNa(word: string, reading: string): ConjGroup[] {
    const mk = (e: string) => ({ surface: word + e, kana: reading + e });
    return [
        {
            title: "Thể cơ bản",
            rows: [
                { name: "Hiện tại（肯定）", plain: mk("だ"), polite: mk("です") },
                { name: "Hiện tại（否定）", plain: mk("ではない"), polite: mk("ではありません") },
                { name: "Quá khứ（肯定）", plain: mk("だった"), polite: mk("でした") },
                { name: "Quá khứ（否定）", plain: mk("ではなかった"), polite: mk("ではありませんでした") },
            ],
        },
        {
            title: "Liên dụng・Điều kiện",
            rows: [
                { name: "Te形（で）", plain: mk("で") },
                { name: "Liên dụng（副詞化）", plain: mk("に") },
                { name: "Điều kiện（なら）", plain: mk("なら") },
                { name: "Điều kiện（たら）", plain: mk("だったら") },
            ],
        },
    ];
}

const CLASS_LABELS: Record<Exclude<VerbClass, null>, string> = {
    "godan": "Động từ nhóm 1 (godan)",
    "ichidan": "Động từ nhóm 2 (ichidan)",
    "suru": "Động từ bất quy tắc (する)",
    "kuru": "Động từ bất quy tắc (来る)",
    "adj-i": "Tính từ đuôi -い",
    "adj-na": "Tính từ đuôi -な",
};

/**
 * Chia một từ. Trả về null khi không phải động từ / tính từ chia được
 * (danh từ, phó từ, mã thiếu…) → component gọi sẽ ẩn bảng.
 */
export function conjugate(
    word: string,
    reading: string | null | undefined,
    wordType: string | null | undefined,
): ConjugationResult | null {
    const w = (word || "").trim();
    const r = (reading || word || "").trim();
    if (!w) return null;

    const cls = detectClass(w, r, wordType || "");
    if (!cls) return null;

    let groups: ConjGroup[] | null;
    switch (cls) {
        case "godan":   groups = conjugateGodan(w, r); break;
        case "ichidan": groups = conjugateIchidan(w, r); break;
        case "suru":    groups = conjugateSuru(w, r); break;
        case "kuru":    groups = conjugateKuru(w); break;
        case "adj-i":   groups = conjugateAdjI(w, r); break;
        case "adj-na":  groups = conjugateAdjNa(w, r); break;
        default:        groups = null;
    }
    if (!groups) return null; // godan với kana cuối lạ → bail an toàn.

    return { classLabel: CLASS_LABELS[cls], groups };
}