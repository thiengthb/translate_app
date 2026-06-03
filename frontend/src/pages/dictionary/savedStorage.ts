// ── Lưu trữ "Sổ tay" (từ/kanji đã lưu) ────────────────────────────────
// Nguồn dữ liệu chính là SERVER (per-user, /api/dictionary/notebook).
// localStorage chỉ còn là cache offline: render tức thì khi mở trang, và là
// nguồn cho lần migrate một-lần (dữ liệu lưu từ trước khi có backend).
//
// - loadSavedWords/loadSavedKanjis: đọc cache (đồng bộ, cho initial state).
// - fetchNotebook: lấy bản chuẩn từ server (lần đầu sẽ merge cache cũ lên
//   server qua /sync), cập nhật lại cache.
// - toggleSavedWord/toggleSavedKanji: optimistic — cập nhật cache ngay, gọi
//   API nền; lỗi mạng thì giữ thay đổi local (lần fetch sau sẽ chỉnh lại).
import { notebookApi } from "@/api/features/dictionary.api";
import type {
    WordSearchResult, DictionaryKanjiDetail, NotebookResponse,
} from "@/types";
import { logger } from "@/lib/logger";

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

// ── Toggle (optimistic) ───────────────────────────────────────────────
export function toggleSavedWord(word: WordSearchResult): WordSearchResult[] {
    const saved = loadSavedWords();
    const exists = saved.some((w) => w.id === word.id);
    const next   = exists ? saved.filter((w) => w.id !== word.id) : [word, ...saved];
    writeCache(next, loadSavedKanjis());
    void (exists ? notebookApi.removeWord(word.id) : notebookApi.saveWord(word.id))
        .catch((e) => logger.warn("notebook: sync word thất bại, giữ thay đổi local", e));
    return next;
}

export function toggleSavedKanji(kanji: DictionaryKanjiDetail): DictionaryKanjiDetail[] {
    const saved = loadSavedKanjis();
    const exists = saved.some((k) => k.character === kanji.character);
    const next   = exists ? saved.filter((k) => k.character !== kanji.character) : [kanji, ...saved];
    writeCache(loadSavedWords(), next);
    void (exists ? notebookApi.removeKanji(kanji.character) : notebookApi.saveKanji(kanji.character))
        .catch((e) => logger.warn("notebook: sync kanji thất bại, giữ thay đổi local", e));
    return next;
}

export function clearAllSaved() {
    localStorage.removeItem(SAVED_WORDS_KEY);
    localStorage.removeItem(SAVED_KANJIS_KEY);
    void notebookApi.clearAll()
        .catch((e) => logger.warn("notebook: xóa tất cả trên server thất bại", e));
}

// ── Ghi chú cá nhân ───────────────────────────────────────────────────
export async function saveNote(entryId: number, note: string): Promise<void> {
    await notebookApi.updateNote(entryId, note);
}