/**
 * Furigana alignment — khớp reading (kana) với từng cụm kanji trong word
 * để render ruby text: 食べる + たべる → <ruby>食<rt>た</rt></ruby>べる.
 *
 * Thuật toán: tách word thành các đoạn xen kẽ kanji/kana. Các đoạn kana
 * (okurigana) phải xuất hiện y nguyên trong reading nên dùng làm "mỏ neo";
 * phần reading nằm giữa hai mỏ neo được gán cho cụm kanji tương ứng.
 * Đệ quy + backtracking xử lý trường hợp mỏ neo xuất hiện ở nhiều vị trí.
 *
 * Nếu không khớp được (từ đọc bất quy tắc), fallback an toàn: ruby cho cả từ
 * — không bao giờ hiển thị sai, chỉ kém chi tiết hơn.
 */

export interface FuriganaSegment {
    text: string;
    /** Cách đọc đặt phía trên — chỉ có ở đoạn chứa kanji */
    ruby?: string;
}

// Hiragana + katakana (kể cả katakana mở rộng & dấu kéo dài ー)
const KANA_CHAR = /[ぁ-ゟ゠-ヿㇰ-ㇿ]/;

function isKanaChar(ch: string): boolean {
    return KANA_CHAR.test(ch);
}

/** Katakana → hiragana (ký tự khác giữ nguyên) để so khớp không phân biệt loại kana. */
export function toHiragana(s: string): string {
    let out = "";
    for (const ch of s) {
        const code = ch.codePointAt(0) ?? 0;
        out += code >= 0x30a1 && code <= 0x30f6
            ? String.fromCodePoint(code - 0x60)
            : ch;
    }
    return out;
}

interface Run {
    text: string;
    kana: boolean;
}

/** Tách word thành các đoạn liên tiếp cùng loại (kana / không-kana). */
function tokenize(word: string): Run[] {
    const runs: Run[] = [];
    for (const ch of word) {
        const kana = isKanaChar(ch);
        const last = runs[runs.length - 1];
        if (last && last.kana === kana) last.text += ch;
        else runs.push({ text: ch, kana });
    }
    return runs;
}

/**
 * Khớp word ↔ reading thành danh sách segment để render ruby.
 *
 * - Word toàn kana / reading trống / word === reading → 1 segment, không ruby.
 * - Khớp được → mỗi cụm kanji nhận đúng phần reading của nó.
 * - Không khớp được → fallback: cả từ nhận toàn bộ reading.
 */
export function alignFurigana(word: string, reading?: string | null): FuriganaSegment[] {
    if (!word) return [];
    if (!reading || toHiragana(word) === toHiragana(reading)) return [{ text: word }];

    const runs = tokenize(word);
    if (!runs.some((r) => !r.kana)) return [{ text: word }]; // toàn kana — không cần ruby

    const readHira = toHiragana(reading);

    // Số ký tự reading tối thiểu mà runs[i..] cần (kana = đúng độ dài, kanji ≥ 1)
    // — dùng để chặn trên độ dài thử cho mỗi cụm kanji.
    const minTail: number[] = new Array(runs.length + 1);
    minTail[runs.length] = 0;
    for (let i = runs.length - 1; i >= 0; i--) {
        minTail[i] = minTail[i + 1] + (runs[i].kana ? runs[i].text.length : 1);
    }

    // Gán reading[pos..] cho runs[idx..]; trả null nếu không khớp được.
    const solve = (idx: number, pos: number): FuriganaSegment[] | null => {
        if (idx === runs.length) return pos === reading.length ? [] : null;
        const run = runs[idx];

        if (run.kana) {
            // Mỏ neo: đoạn kana phải khớp y nguyên tại vị trí hiện hành.
            const len = run.text.length;
            if (readHira.slice(pos, pos + len) !== toHiragana(run.text)) return null;
            const rest = solve(idx + 1, pos + len);
            return rest === null ? null : [{ text: run.text }, ...rest];
        }

        // Cụm kanji: thử mọi độ dài đọc có thể (ngắn trước), backtrack nếu phần sau fail.
        const maxLen = reading.length - pos - minTail[idx + 1];
        for (let len = 1; len <= maxLen; len++) {
            const rest = solve(idx + 1, pos + len);
            if (rest !== null) {
                return [{ text: run.text, ruby: reading.slice(pos, pos + len) }, ...rest];
            }
        }
        return null;
    };

    return solve(0, 0) ?? [{ text: word, ruby: reading }];
}