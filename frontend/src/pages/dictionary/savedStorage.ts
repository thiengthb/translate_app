// ── Lưu trữ "Sổ tay" (từ/kanji đã lưu) ────────────────────────────────
// Sổ tay là tính năng thuần FE: danh sách nằm trong localStorage, không có
// entity/endpoint backend. Các helper dưới đây được DictionaryPage (để bật/tắt
// bookmark trên thẻ kết quả) và NotebookPage (để hiển thị + đối chiếu) dùng chung.
import { dictionaryApi } from "@/api/features/dictionary.api";
import type { WordSearchResult, DictionaryKanjiDetail } from "@/types";

export const SAVED_WORDS_KEY  = "dict_saved_words";
export const SAVED_KANJIS_KEY = "dict_saved_kanjis";

export function loadSavedWords(): WordSearchResult[] {
    try { return JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) ?? "[]"); }
    catch { return []; }
}
export function loadSavedKanjis(): DictionaryKanjiDetail[] {
    try { return JSON.parse(localStorage.getItem(SAVED_KANJIS_KEY) ?? "[]"); }
    catch { return []; }
}
export function toggleSavedWord(word: WordSearchResult): WordSearchResult[] {
    const saved = loadSavedWords();
    const idx   = saved.findIndex((w) => w.id === word.id);
    const next  = idx >= 0 ? saved.filter((_, i) => i !== idx) : [word, ...saved];
    localStorage.setItem(SAVED_WORDS_KEY, JSON.stringify(next));
    return next;
}
export function toggleSavedKanji(kanji: DictionaryKanjiDetail): DictionaryKanjiDetail[] {
    const saved = loadSavedKanjis();
    const idx   = saved.findIndex((k) => k.character === kanji.character);
    const next  = idx >= 0 ? saved.filter((_, i) => i !== idx) : [kanji, ...saved];
    localStorage.setItem(SAVED_KANJIS_KEY, JSON.stringify(next));
    return next;
}
export function clearAllSaved() {
    localStorage.removeItem(SAVED_WORDS_KEY);
    localStorage.removeItem(SAVED_KANJIS_KEY);
}

export type ReconcileResult = {
    words: WordSearchResult[];
    kanjis: DictionaryKanjiDetail[];
    wordsChanged: boolean;
    kanjisChanged: boolean;
};

// Đối chiếu mục "đã lưu" với server: bỏ những từ/kanji đã bị xóa (hoặc tắt
// hoạt động) khỏi localStorage. Lỗi mạng thì GIỮ NGUYÊN để không xóa nhầm.
// Trả về danh sách mới + cờ cho biết có thay đổi để caller cập nhật state.
export async function reconcileSaved(): Promise<ReconcileResult> {
    const words  = loadSavedWords();
    const kanjis = loadSavedKanjis();

    const wordChecks = await Promise.all(words.map(async (w) => {
        try {
            const res = await dictionaryApi.search(w.word, 50);
            return res.find((r) => r.id === w.id) ?? null; // null = đã bị xóa → loại
        } catch {
            return w; // lỗi mạng → giữ lại bản cũ
        }
    }));
    const liveWords = wordChecks.filter(Boolean) as WordSearchResult[];

    const kanjiChecks = await Promise.all(kanjis.map(async (k) => {
        try {
            const res = await dictionaryApi.kanjiSearch(k.character, 10);
            return res.find((r) => r.character === k.character) ?? null;
        } catch {
            return k;
        }
    }));
    const liveKanjis = kanjiChecks.filter(Boolean) as DictionaryKanjiDetail[];

    const wordsChanged  = liveWords.length !== words.length;
    const kanjisChanged = liveKanjis.length !== kanjis.length;

    if (wordsChanged)  localStorage.setItem(SAVED_WORDS_KEY,  JSON.stringify(liveWords));
    if (kanjisChanged) localStorage.setItem(SAVED_KANJIS_KEY, JSON.stringify(liveKanjis));

    return { words: liveWords, kanjis: liveKanjis, wordsChanged, kanjisChanged };
}