// ── Lưu trữ "Sổ tay" (từ/kanji đã lưu) ────────────────────────────────
// Nguồn dữ liệu chính là SERVER (per-user, /api/dictionary/notebook).
// localStorage chỉ còn là cache offline: render tức thì khi mở trang, và là
// nguồn cho lần migrate một-lần (dữ liệu lưu từ trước khi có backend).
//
// - loadSavedWords/loadSavedKanjis: đọc cache (đồng bộ, cho initial state).
// - fetchNotebook: lấy bản chuẩn từ server — aggregate "đã lưu ở bất kỳ sổ tay
//   nào" (lần đầu sẽ merge cache cũ lên server qua /sync), cập nhật lại cache.
// - markWordSaved/markKanjiSaved: CHỈ cập nhật cache (NotebookPicker tự gọi API
//   per-notebook) để icon bookmark + preview phản ánh trạng thái đã-lưu.
import { notebookApi } from "@/api/features/dictionary.api";
import type {
    WordSearchResult, DictionaryKanjiDetail, NotebookResponse,
} from "@/types";

export const SAVED_WORDS_KEY  = "dict_saved_words";
export const SAVED_KANJIS_KEY = "dict_saved_kanjis";
const MIGRATED_KEY = "dict_notebook_migrated";

// ── Cache helpers (đồng bộ) ───────────────────────────────────────────
export function loadSavedWords(): WordSearchResult[] {
    try { return JSON.parse(localStorage.getItem(SAVED_WORDS_KEY) ?? "[]"); }
    catch { return []; }
}
export function loadSavedKanjis(): DictionaryKanjiDetail[] {
    try { return JSON.parse(localStorage.getItem(SAVED_KANJIS_KEY) ?? "[]"); }
    catch { return []; }
}
function writeCache(words: WordSearchResult[], kanjis: DictionaryKanjiDetail[]) {
    try {
        localStorage.setItem(SAVED_WORDS_KEY,  JSON.stringify(words));
        localStorage.setItem(SAVED_KANJIS_KEY, JSON.stringify(kanjis));
    } catch { /* storage đầy/bị chặn — bỏ qua, server vẫn là nguồn chuẩn */ }
}

export type NotebookData = {
    words: WordSearchResult[];
    kanjis: DictionaryKanjiDetail[];
    /** Bản đầy đủ từ server (kèm entryId + note) — NotebookPage dùng để sửa ghi chú. */
    raw: NotebookResponse;
};

// ── Server sync ───────────────────────────────────────────────────────
// Lấy sổ tay từ server. Lần gọi đầu tiên (chưa có cờ migrate) sẽ đẩy các mục
// đang nằm trong localStorage lên server qua /sync để không mất dữ liệu cũ.
// Throw khi lỗi mạng — caller tự quyết định fallback về cache.
//
// Single-flight: DictionaryPage và NotebookPage đều gọi hàm này khi mount
// (StrictMode dev còn gọi 2 lần) — nếu để các request /sync chạy song song,
// MySQL sẽ deadlock trên unique index (user_id, word_id) khi 2 transaction
// cùng insert một bộ dòng. Dùng chung 1 promise đang bay để chỉ có đúng
// 1 request tại một thời điểm.
let inflightFetch: Promise<NotebookData> | null = null;

export function fetchNotebook(): Promise<NotebookData> {
    if (!inflightFetch) {
        inflightFetch = doFetchNotebook().finally(() => { inflightFetch = null; });
    }
    return inflightFetch;
}

async function doFetchNotebook(): Promise<NotebookData> {
    let raw: NotebookResponse;
    const migrated = localStorage.getItem(MIGRATED_KEY) === "1";
    if (!migrated) {
        const localWords  = loadSavedWords();
        const localKanjis = loadSavedKanjis();
        raw = await notebookApi.sync(
            localWords.map((w) => w.id),
            localKanjis.map((k) => k.character),
        );
        try { localStorage.setItem(MIGRATED_KEY, "1"); } catch { /* ignore */ }
    } else {
        raw = await notebookApi.get();
    }
    const words  = raw.words.map((e) => e.word);
    const kanjis = raw.kanjis.map((e) => e.kanji);
    writeCache(words, kanjis);
    return { words, kanjis, raw };
}

// ── Cập nhật cache "đã lưu ở ≥1 sổ tay" (dùng với NotebookPicker) ──────
// Picker tự gọi API per-notebook; các hàm này CHỈ cập nhật cache localStorage
// để icon bookmark + preview Sổ tay phản ánh trạng thái đã-lưu-ở-bất-kỳ-đâu.
export function markWordSaved(word: WordSearchResult, saved: boolean): WordSearchResult[] {
    const cur = loadSavedWords();
    const next = saved
        ? (cur.some((w) => w.id === word.id) ? cur : [word, ...cur])
        : cur.filter((w) => w.id !== word.id);
    writeCache(next, loadSavedKanjis());
    return next;
}

export function markKanjiSaved(kanji: DictionaryKanjiDetail, saved: boolean): DictionaryKanjiDetail[] {
    const cur = loadSavedKanjis();
    const next = saved
        ? (cur.some((k) => k.character === kanji.character) ? cur : [kanji, ...cur])
        : cur.filter((k) => k.character !== kanji.character);
    writeCache(loadSavedWords(), next);
    return next;
}

// ── Ghi chú cá nhân ───────────────────────────────────────────────────
export async function saveNote(entryId: number, note: string): Promise<void> {
    await notebookApi.updateNote(entryId, note);
}