# Chức năng Từ điển — Tổng quan & Luồng xử lý

> Tài liệu mô tả toàn bộ chức năng từ điển (dictionary) của dự án: kiến trúc, endpoint, và các luồng dữ liệu end-to-end.

## 1. Kiến trúc tổng thể

### Backend — 2 nhóm package

| Package | Vai trò |
|---|---|
| `system/words/` | Các entity dữ liệu từ điển, dùng `@AutoCrud` (CRUD quản trị): `Word`, `Meaning`, `Example`, `Kanji`, `WordKanji` + lookup tables `Level` (N5–N1), `Language` (VI/EN/JP), `Representation` (KANJI/HIRAGANA/KATAKANA/MIXED), `WordType` |
| `system/dictionary/` | Controller custom cho người dùng cuối: `DictionaryController` (`/api/dictionary`) và `NotebookController` (`/api/dictionary/notebook` — KHÔNG `@AutoCrud`, per-user) |

### Quan hệ dữ liệu

```
Word (1)──(n) Meaning                  ← nghĩa đa ngôn ngữ (VI/EN)
Word (1)──(n) WordKanji ──(1) Kanji    ← kanji trong từ (denormalize onyomi/kunyomi)
Word (1)──(n) Example                  ← câu ví dụ: gốc => bản dịch
User (1)──(n) NotebookEntry ──(Word | Kanji)
        ← sổ tay: hard delete, UNIQUE(user_id, word_id) và UNIQUE(user_id, kanji_id)
```

### Frontend

- Pages: `frontend/src/pages/dictionary/` — `DictionaryPage` (tra từ), `VocabularyBrowsePage` (duyệt), `NotebookPage` (sổ tay), `HandwritingInput`, `VoiceInput`, `KanjiBreakdown`, `KanjiStrokeOrder`, `WordCreatePage`
- API client: `frontend/src/api/features/dictionary.api.ts`
- Cache offline sổ tay: `frontend/src/pages/dictionary/savedStorage.ts`
- Furigana: `frontend/src/components/common/FuriganaText.tsx` (render `<ruby>`)

---

## 2. Luồng tra từ (search)

```
User gõ "taberu" / "食べる" / "ăn"   (DictionaryPage, debounce 300ms)
  → GET /api/dictionary/suggest?q=...          (autocomplete prefix khi đang gõ)
  → GET /api/dictionary/search?q=...&limit=20  (khi submit)
      ↓ DictionaryServiceImpl.search()
      ↓ RomajiConverter: nếu q toàn a-z → convert Hepburn romaji → hiragana
        (greedy match 4→1 ký tự, hỗ trợ っ, normalize macron ō→oo)
      ↓ DictionarySearchRepository: LIKE trên word / reading / meaning,
        sort frequency ASC
      ↓ toWordResult(): build WordSearchResult gồm meanings (ưu tiên VI),
        kanjis (từ WordKanji), examples, badge level/representation
  → FE render card: nghĩa + furigana (<ruby>) + kanji breakdown
```

Sau khi có kết quả, user có thể bấm thêm:

- **Ví dụ Tatoeba**: `GET /api/dictionary/examples?word=...` → `TatoebaClient` gọi tatoeba.org — ưu tiên câu dịch VI, thiếu thì bù EN, dedup theo sentenceId, timeout 8s, lỗi thì degrade êm (không throw).
- **Audio**: `GET /api/dictionary/audio?word=...` → `ForvoClient` (cần config `forvo.api-key`); nếu 204/không có → FE fallback Web Speech API TTS.

---

## 3. Luồng tìm kanji (3 bước fallback)

```
User chuyển mode "kanji", nhập "食" / "shoku" / "seijin"
  → GET /api/dictionary/kanji-search?q=...
      ↓ DictionaryServiceImpl.searchKanji()
      Step 1: extract ký tự kanji trong q → lookup trực tiếp KanjiRepository
      Step 2: chưa đủ → keyword search trên character/meaning/onyomi/kunyomi
      Step 3: vẫn chưa đủ → search Word trước (romaji "seijin" → 成人)
              rồi suy ra kanji 成, 人 từ WordKanji
      ↓ toKanjiResult(): kèm tối đa 8 related words (JOIN FETCH, sort frequency)
  → FE: KanjiBreakdown (onyomi/kunyomi/bộ thủ/số nét) + KanjiStrokeOrder (SVG nét vẽ)
```

---

## 4. Luồng nhập liệu thay thế

### Viết tay (handwriting)

```
HandwritingInput: canvas 272×272, user vẽ → strokes [[xs],[ys]]
  → POST /api/dictionary/handwriting
      ↓ BE thêm timestamps → gọi Google Input Tools API
        (https://www.google.com/inputtools/request?ime=handwriting, timeout 8s)
  → trả top 10 ký tự gợi ý → user chọn → đổ vào ô search
```

### Giọng nói (voice)

`VoiceInput` dùng Web Speech Recognition thuần FE → text → search (không qua BE).

---

## 5. Luồng duyệt từ vựng / kanji (browse)

```
VocabularyBrowsePage — URL shareable: ?tab=kanji&level=N5&page=2
  → GET /api/dictionary/browse/words?level=N5&page=0&size=20   (sort frequency ASC)
  → GET /api/dictionary/browse/kanjis?level=N5&page=0&size=24  (sort JLPT→stroke;
        KHÔNG kèm related words để tránh N+1)
  → Trả BrowseResult{items, page, size, totalItems, totalPages}
  → FE render card + pagination; đổi level → reset page
  → Click 1 từ → navigate /dictionary?q=...  (xem chi tiết)
```

Ngoài ra `GET /api/dictionary/featured?wordLimit=&kanjiLimit=` trả từ + kanji đề xuất cho trang chủ (từ có frequency, kanji sort JLPT→stroke).

---

## 6. Luồng sổ tay (Notebook)

**Nguyên tắc: server (bảng `notebook_entries`) là source of truth, localStorage chỉ là cache offline.**

```
Mount NotebookPage / DictionaryPage
  1. Render NGAY từ localStorage (dict_saved_words / dict_saved_kanjis) — optimistic
  2. fetchNotebook() — single-flight (1 promise toàn cục, tránh duplicate
     khi StrictMode / nhiều tab)
     - Lần đầu (chưa có cờ dict_notebook_migrated):
         POST /api/dictionary/notebook/sync {wordIds, kanjiChars}
         → BE merge cache cũ lên server (insertIgnoringDuplicate,
           sort id ASC giảm deadlock) → FE set cờ migrated
     - Các lần sau: GET /api/dictionary/notebook
  3. applyServerData() → server override local → cập nhật lại localStorage
```

### Lưu / bỏ lưu (từ DictionaryPage hoặc NotebookPage)

```
toggleSavedWord() → update localStorage ngay → gọi API nền:
  POST   /api/dictionary/notebook/words/{wordId}     (idempotent — đã có thì trả entry cũ)
  DELETE /api/dictionary/notebook/words/{wordId}     (HARD delete để unique constraint
                                                      (user_id, word_id) cho phép lưu lại)
  POST/DELETE /api/dictionary/notebook/kanjis/{character}   (tương tự)
Offline/lỗi mạng → giữ thay đổi local, lần fetch sau server chỉnh lại
```

### Ghi chú cá nhân & xóa

```
PUT    /api/dictionary/notebook/entries/{entryId}/note  → verify ownership → trim & save
DELETE /api/dictionary/notebook                          → xóa toàn bộ sổ tay
```

**Lưu ý kỹ thuật:**
- Tất cả endpoint notebook yêu cầu `@PreAuthorize("isAuthenticated()")` — không cần permission RBAC, chỉ check ownership.
- Controller có retry deadlock (`PessimisticLockingFailureException`, max 2 lần, backoff 50–100ms).
- Insert duplicate được catch qua `DataIntegrityViolationException` (idempotent).

---

## 7. Luồng quản trị dữ liệu (admin)

### Tạo từ đầy đủ (composite)

```
WordCreatePage → POST /api/dictionary/words (WordCreateRequest)
  → WordService.createFull(): 1 transaction tạo Word + Meanings + Examples + WordKanjis
```

### Import / Export (WordDataIoService — custom, không dùng DataIO generic)

```
GET  /api/dictionary/words/template   → tải template Excel
POST /api/dictionary/words/import     → parse XLSX/CSV, mỗi dòng 1 từ
POST /api/dictionary/words/export?format=xlsx|csv
```

Format dữ liệu trong file:

| Cột | Ví dụ | Delimiter |
|---|---|---|
| Meanings | `vi:nước\|en:water` | `\|` tách mục, `:` tách ngôn ngữ:nội dung |
| Examples | `毎日水を飲みます。=>Tôi uống nước mỗi ngày.` | `\|` tách mục, `=>` tách gốc=>dịch |

Import reuse `WordService.createFull()` per row (cùng transaction).

### CRUD lẻ từng entity (auto-CRUD)

`/api/words`, `/api/kanjis`, `/api/meanings`, `/api/examples`, `/api/levels`, `/api/languages`, `/api/word-types`, `/api/word-kanjis`, `/api/representations` — endpoint GET/POST/PUT/DELETE/bulk/export/import sinh tự động từ `@AutoCrud`; permission `WORD_*`, `KANJI_*`, ... sinh từ `@ResourcePermission`.

---

## 8. Tích hợp ngoài

| Dịch vụ | Endpoint BE | API ngoài | Ghi chú |
|---|---|---|---|
| Tatoeba | `GET /examples` | `tatoeba.org/en/api_v0/search` | Ưu tiên VI, bù EN; dedup sentenceId; furigana từ transcriptions; timeout 8s |
| Forvo | `GET /audio` | `apifree.forvo.com` | Optional (cần `forvo.api-key`); FE fallback TTS; timeout 6s |
| Google Input Tools | `POST /handwriting` | `google.com/inputtools/request` | Nhận diện viết tay; top 10 gợi ý; timeout 8s |

Tất cả tích hợp ngoài đều graceful degrade — lỗi chỉ log warning, không làm vỡ luồng chính.

---

## 9. Seed data

`init/DictionaryDataInitializer.java` (`@Order(13)`, idempotent — skip nếu bảng `words` đã có dữ liệu):
- Lookup tables: 4 representation, 5 level (N5–N1), 3 language (VI/EN/JP), ~16 word type
- ~12 từ N5 mẫu kèm nghĩa VI/EN + ví dụ

---

## 10. Tóm tắt endpoint

| Nhóm | Endpoint | Chức năng |
|---|---|---|
| Tra cứu | `GET /api/dictionary/search`, `/suggest`, `/kanji-search` | search, autocomplete, kanji (romaji→hiragana) |
| Duyệt | `GET /api/dictionary/browse/words`, `/browse/kanjis`, `/featured` | phân trang, lọc JLPT |
| Tích hợp ngoài | `GET /examples` (Tatoeba), `GET /audio` (Forvo), `POST /handwriting` (Google) | ví dụ, phát âm, viết tay |
| Sổ tay | `GET/DELETE /notebook`, `POST/DELETE /notebook/words/{id}`, `/notebook/kanjis/{char}`, `PUT /notebook/entries/{id}/note`, `POST /notebook/sync` | per-user, idempotent, merge offline |
| Quản trị | `POST /api/dictionary/words`, `/words/import`, `/words/export`, `/words/template` + auto-CRUD `/api/words`... | tạo từ composite, import/export Excel/CSV |

## 11. File tham chiếu chính

| Thành phần | File |
|---|---|
| Controller tra cứu | `backend/.../system/dictionary/DictionaryController.java` |
| Service tra cứu | `backend/.../system/dictionary/DictionaryServiceImpl.java` |
| Romaji → Hiragana | `backend/.../system/dictionary/RomajiConverter.java` |
| Tatoeba / Forvo client | `backend/.../system/dictionary/TatoebaClient.java`, `ForvoClient.java` |
| Sổ tay | `backend/.../system/dictionary/notebook/NotebookController.java`, `NotebookServiceImpl.java`, `NotebookEntry.java` |
| Import/Export từ | `backend/.../system/words/word/WordDataIoService.java` |
| Entity từ điển | `backend/.../system/words/{word,mean,example,kanji,word_kanji,level,language,representation,word_type}/` |
| Seed data | `backend/.../init/DictionaryDataInitializer.java` |
| Trang tra từ | `frontend/src/pages/dictionary/DictionaryPage.tsx` |
| Trang duyệt | `frontend/src/pages/dictionary/VocabularyBrowsePage.tsx` |
| Trang sổ tay | `frontend/src/pages/dictionary/NotebookPage.tsx` |
| Cache sổ tay | `frontend/src/pages/dictionary/savedStorage.ts` |
| API client | `frontend/src/api/features/dictionary.api.ts` |
| Furigana | `frontend/src/components/common/FuriganaText.tsx` |