# Module Dictionary — Tài liệu kỹ thuật

Module tra cứu từ điển tiếng Nhật. **Không có entity riêng** — query vào bảng của module Words và tích hợp API bên ngoài (Tatoeba, Forvo, Google Input Tools).

---

## 1. Tổng quan

Dictionary là **read-only search layer** trên top của Words module:

```
Client
  │
  ▼
DictionaryController        ← REST endpoints (7 endpoints)
  │
  ▼
DictionaryServiceImpl       ← Business logic: search, convert, enrich
  ├── RomajiConverter            ← Utility: Romaji → Hiragana
  ├── DictionarySearchRepository ← Custom JPQL query vào words/meanings
  ├── KanjiRepository            ← Query vào bảng kanjis
  ├── WordKanjiRepository        ← Cross-reference word ↔ kanji
  ├── TatoebaClient              ← HTTP client → api.tatoeba.org
  └── ForvoClient                ← HTTP client → forvo.com/api
```

---

## 2. Cấu trúc package

```
system/dictionary/
├── DictionaryController.java        ← REST endpoints
├── DictionaryService.java           ← Interface
├── DictionaryServiceImpl.java       ← Logic chính
├── DictionarySearchRepository.java  ← Custom JPQL queries
├── RomajiConverter.java             ← Utility: romaji → hiragana
├── TatoebaClient.java               ← External API client
├── ForvoClient.java                 ← External API client
├── DictionaryRequest.java           ← Input DTO
├── HandwritingRequest.java          ← Input DTO cho handwriting
├── WordSearchResult.java            ← Output DTO (word search)
├── KanjiSearchResult.java           ← Output DTO (kanji search)
├── WordSuggestion.java              ← Output DTO (autocomplete)
├── FeaturedResult.java              ← Output DTO (homepage featured)
├── TatoebaExample.java              ← Output DTO (external examples)
└── WordAudio.java                   ← Output DTO (audio URL)
```

---

## 3. REST Endpoints

| Method | Path | Mô tả | Limit |
|---|---|---|---|
| `POST` | `/api/dictionary/words` | Tạo từ gộp (ủy quyền WordServiceImpl.createFull) | — |
| `GET` | `/api/dictionary/search?q=` | Tìm từ theo kanji/kana/romaji/nghĩa | max 50 |
| `GET` | `/api/dictionary/suggest?q=` | Autocomplete (prefix match) | max 20 |
| `GET` | `/api/dictionary/kanji-search?q=` | Tìm và phân tích kanji (3-step) | max 20 |
| `GET` | `/api/dictionary/featured` | Từ/Kanji phổ biến cho homepage | word max 20, kanji max 30 |
| `GET` | `/api/dictionary/examples?word=` | Câu ví dụ từ Tatoeba API | max 20 |
| `GET` | `/api/dictionary/audio?word=` | URL audio phát âm từ Forvo | — |
| `POST` | `/api/dictionary/handwriting` | Nhận diện chữ viết tay → kanji | — |

---

## 4. `DictionarySearchRepository` — JPQL Queries

Repository này extends `JpaRepository<Word, Long>` nhưng chỉ chứa các query tìm kiếm, không phải repository CRUD thông thường.

### 4.1 `search(q, kana, pageable)`

```sql
SELECT DISTINCT w FROM Word w
JOIN w.meanings m
JOIN FETCH w.level l
JOIN FETCH w.representation r
WHERE w.isDeleted = false AND w.isActive = true
AND (
    LOWER(w.word)    LIKE LOWER(CONCAT('%', :q,    '%'))   -- khớp từ gốc
    OR LOWER(w.reading) LIKE LOWER(CONCAT('%', :q,    '%'))  -- khớp cách đọc
    OR LOWER(m.name)    LIKE LOWER(CONCAT('%', :q,    '%'))  -- khớp nghĩa
    OR LOWER(w.word)    LIKE LOWER(CONCAT('%', :kana, '%'))  -- khớp sau convert romaji
    OR LOWER(w.reading) LIKE LOWER(CONCAT('%', :kana, '%'))
)
ORDER BY w.frequency ASC NULLS LAST, w.word ASC
```

`JOIN FETCH` trên `level` và `representation` để tải sẵn quan hệ, tránh lazy load thêm. `JOIN` (không fetch) trên `meanings` chỉ để dùng trong WHERE clause.

### 4.2 `suggest(q, kana, pageable)`

Giống `search` nhưng dùng **prefix match** (`CONCAT(:q, '%')`) thay vì contains — phù hợp autocomplete:

```sql
WHERE ... AND (
    LOWER(w.word)    LIKE LOWER(CONCAT(:q,    '%'))   -- starts with q
    OR LOWER(w.reading) LIKE LOWER(CONCAT(:kana, '%')) -- starts with kana form
    OR LOWER(m.name)    LIKE LOWER(CONCAT(:q,    '%'))
)
```

### 4.3 `findFeaturedWords(pageable)`

```sql
SELECT w FROM Word w
JOIN FETCH w.level l
JOIN FETCH w.representation r
WHERE w.isDeleted = false AND w.isActive = true
AND w.frequency IS NOT NULL
ORDER BY w.frequency ASC
```

Chỉ lấy từ có `frequency` (tức từ đã được đánh tần suất), sắp theo frequency tăng dần (số nhỏ = phổ biến hơn).

---

## 5. `RomajiConverter` — Romaji → Hiragana

Cho phép user gõ "nihongo" thay vì "にほんご" mà vẫn tìm được.

### Thuật toán

```
Input: "nihongo"
  ↓ normalize: ā→aa, ū→uu, xóa - và '
  ↓ xử lý từng ký tự với greedy match:
     "ni" → に
     "ho" → ほ
     "n"  → ん (trước 'g' là consonant)
     "go" → ご
Output: "にほんご"
```

**Greedy matching** — PATTERNS list được sort **giảm dần theo độ dài key** (4 → 3 → 2 → 1 chars). Mỗi bước thử khớp từ pattern dài nhất trước, đảm bảo "tchi" → "っち" không bị split thành "t" + "chi".

**Xử lý đặc biệt:**
- Double consonant (`kk`, `ss`, `pp`...) → `っ` + tiếp tục (trừ `nn`)
- `nn` → `ん`
- `n` trước consonant (không phải `y`) hoặc cuối chuỗi → `ん`
- Long vowels: `ā`→`aa`, `ū`→`uu`, `ō`→`oo` (Hepburn diacritics)

PATTERNS được khởi tạo một lần trong `static {}` block — zero runtime cost.

### Ví dụ các pattern được hỗ trợ

| Romaji | Hiragana | Ghi chú |
|---|---|---|
| sha, shi, shu, sho | しゃ し しゅ しょ | Compound kana |
| chi, cha, chu, cho | ち ちゃ ちゅ ちょ | |
| tsu | つ | |
| kya, kyu, kyo | きゃ きゅ きょ | |
| tchi / cchi | っち | 4-char greedy |
| nn | ん | Double n |

---

## 6. `DictionaryServiceImpl` — Logic tìm kiếm

### 6.1 Tìm từ (`search`)

```java
public List<WordSearchResult> search(String query, int limit) {
    String q    = query.trim();
    String kana = RomajiConverter.isRomaji(q) ? RomajiConverter.toHiragana(q) : q;
    return searchRepository.search(q, kana, PageRequest.of(0, limit))
                           .stream().map(this::toResult).toList();
}
```

Luôn truyền cả `q` gốc lẫn `kana` (đã convert). Nếu input là kanji/kana, `kana == q` — query vẫn đúng vì LIKE trên cùng giá trị.

`toResult()` map `Word` entity → `WordSearchResult` DTO gồm:
- Thông tin cơ bản: word, reading, wordType, frequency, levelCode, representationCode
- `meaningText`: nghĩa chính (ưu tiên vi)
- `meanings[]`: tất cả nghĩa các ngôn ngữ
- `kanjis[]`: từ `word.wordKanjis` (lọc `isDeleted = false`)
- `examples[]`: từ `word.examples` (lọc `isDeleted = false`)

### 6.2 Tìm kanji (`searchKanji`) — 3-step cascade

```
Input: "seijin" (romaji)
  ↓ convert → "せいじん"

Step 1: extractKanjiChars("seijin") → {} (không có kanji)
         → skip

Step 2: searchByKeyword("%seijin%", "%せいじん%")
         → tìm kanji có meaning/onyomi/kunyomi khớp
         → có thể trả về kết quả nếu có kanji đọc "せいじん"

Step 3: Nếu vẫn rỗng:
         search("seijin", "せいじん") → tìm Word có reading "せいじん"
         → tìm được "成人 (せいじん)"
         → extractKanjiChars("成人") → ["成", "人"]
         → findByCharacterIn(["成", "人"]) → kanji 成, kanji 人
         → return [KanjiSearchResult(成), KanjiSearchResult(人)]
```

`extractKanjiChars()` dùng `Character.UnicodeBlock.CJK_UNIFIED_IDEOGRAPHS` để detect ký tự CJK — chính xác, không cần regex.

Với mỗi kanji tìm được, `toKanjiResult()` gọi `WordKanjiRepository.findByCharacterWithWords()` để lấy tối đa 8 từ chứa kanji đó (sắp theo frequency).

### 6.3 Featured (`featured`)

```java
return FeaturedResult.builder()
    .words(searchRepository.findFeaturedWords(PageRequest.of(0, wordLimit))
                           .stream().map(this::toResult).toList())
    .kanjis(kanjiRepository.findFeaturedKanjis(PageRequest.of(0, kanjiLimit))
                           .stream().map(k -> KanjiSearchResult.builder()...toList())
    .build();
```

Featured kanjis không cần `relatedWords` → builder chỉ set các field cơ bản, `words = List.of()`.

---

## 7. External API Clients

### 7.1 `TatoebaClient` — Ví dụ thực tế

Lấy câu ví dụ thật từ [Tatoeba](https://tatoeba.org) — corpus câu song ngữ do cộng đồng đóng góp. BE đóng vai trò **proxy** (FE không gọi thẳng Tatoeba → tránh CORS + giấu logic), expose qua `GET /api/dictionary/examples?word=`.

> **Phân biệt với `word.examples`:** `examples[]` trong `WordSearchResult` là ví dụ **nội bộ** (seed/admin nhập, lưu DB, hiện ngay). Tatoeba là ví dụ **ngoài**, **lazy-load** chỉ khi user bấm mở — không lưu DB.

```
GET https://tatoeba.org/en/api_v0/search
  params: from=jpn         ← câu gốc tiếng Nhật
          to=vie | eng     ← ngôn ngữ đích (gọi 2 lần)
          query={word}     ← URL-encoded UTF-8
          sort=relevance
  timeout: 8 giây
  User-Agent: DictionaryApp/1.0
```

**Chiến lược ưu tiên VI → bù EN (không phải fallback thuần):**

```java
collect(word, "vie", limit, out, seen);              // lấy bản dịch tiếng Việt trước
if (out.size() < limit)
    collect(word, "eng", limit - out.size(), out, seen);  // THIẾU bao nhiêu thì bù EN bấy nhiêu
```

→ Ưu tiên câu có dịch **tiếng Việt**; nếu chưa đủ `limit` (mặc định 6) thì bổ sung câu dịch **tiếng Anh** cho đủ. Khác với fallback "VI rỗng mới dùng EN" — ở đây VI + EN được **gộp** tới khi đủ số lượng.

**Mỗi lần `collect()` parse JSON:**
- `Set<Long> seen` **khử trùng** theo `id` — 1 câu vừa có dịch VI vừa có EN không bị thêm 2 lần.
- `text` → câu Nhật gốc (`japanese`); câu rỗng → bỏ qua.
- `firstTranscription()` → furigana/phiên âm đầu tiên nếu có (`reading`).
- `firstTranslation(r, lang)` → duyệt mảng `translations` (mảng 2 chiều) tìm bản dịch **đúng ngôn ngữ**; câu không có bản dịch đúng lang → **bỏ qua**.

**Chịu lỗi êm:** mọi lỗi (timeout, status ≠ 200, parse fail) đều `log` rồi trả về phần đã có / danh sách rỗng — **không ném exception**, endpoint luôn an toàn.

Trả về `TatoebaExample[]` gồm: `sentenceId, japanese, reading, translation, translationLang ("vie"|"eng"), source ("Tatoeba")`.

**Frontend — lazy-load trong `WordCard`** (`DictionaryPage.tsx`):

```tsx
const toggleTatoeba = async () => {
    const next = !showTatoeba;
    setShowTatoeba(next);
    if (next && tatoeba === null && !tatoebaLoading) {  // chỉ fetch LẦN ĐẦU mở
        setTatoebaLoading(true);
        try { setTatoeba(await dictionaryApi.examples(word.word)); }
        catch { setTatoeba([]); }            // lỗi → [] (không thử lại)
        finally { setTatoebaLoading(false); }
    }
};
```

- `tatoeba === null` = chưa tải bao giờ → mới gọi API. Đóng/mở lại dùng cache trong state, **không gọi lại**.
- Mỗi thẻ từ có state Tatoeba riêng (`showTatoeba`, `tatoeba`, `tatoebaLoading`).
- `TatoebaRow` render câu Nhật + nút phát âm (Web Speech TTS) + badge ngôn ngữ (VI đỏ / EN xanh) + bản dịch.

### 7.2 `ForvoClient`

```
GET https://apifree.forvo.com/key/{FORVO_API_KEY}/...
  params: word=..., language=ja, format=json
```

**Cần** env var `FORVO_API_KEY`. Nếu không có key, trả về `Optional.empty()`.

Controller trả về `204 No Content` nếu Forvo trả về empty → FE fallback dùng **Web Speech API** (TTS của browser).

### 7.3 Handwriting Recognition

Endpoint `POST /dictionary/handwriting` là proxy đến **Google Input Tools API**:

```
Request: { strokes: [[[xs], [ys]], ...] }  ← tọa độ nét vẽ
  ↓
Add timestamps: [[xs], [ys], [ts]]  (ts[i] = i * 10)
  ↓
POST https://www.google.com/inputtools/request?ime=handwriting&...
  body: { device, options, requests: [{ writing_guide, ink, language: "ja" }] }
  timeout: 8 giây
  headers: User-Agent mobile browser (tránh block)
  ↓
Parse response: data[0] == "SUCCESS" → data[1][0][1] là List<String> candidates
  ↓
Response: ["語", "話", "詔", ...]  ← top 10 ứng viên
```

Không cần API key. Google có rate limit — chỉ dùng từ FE canvas input của user thực.

---

## 8. Output DTOs

### `WordSearchResult`

```java
WordSearchResult {
    id, word, reading, wordType, frequency
    representationCode, representationName
    levelCode, levelName
    meaningText  // nghĩa chính (vi ưu tiên)
    meanings[]   // List<MeaningInfo> { name, languageCode, languageName }
    kanjis[]     // List<KanjiInfo> { character, onyomi, kunyomi, meaning, stroke, radical }
    examples[]   // List<ExampleInfo> { rootExample, toExample, rootLanguageName, toLanguageName }
}
```

### `KanjiSearchResult`

```java
KanjiSearchResult {
    character, meaning, onyomi, kunyomi
    stroke, radical, jlptLevel
    words[]  // List<WordInfo> { word, reading, meaningText }
             // — các từ chứa kanji này, top 8 theo frequency
}
```

### `WordSuggestion` (lightweight cho autocomplete)

```java
WordSuggestion { id, word, reading, meaningText, levelCode }
```

---

## 9. Frontend

### 9.1 `word.api.ts` — Tại sao `createFull` trỏ tới `/dictionary/words`

```typescript
export const wordApi = Object.assign(
    {},
    createBaseApiService<WordDTO, WordFilter>({ path: "/words" }),
    {
        createFull: async (data: WordCreateRequest): Promise<WordDTO> => {
            // POST /dictionary/words — KHÔNG phải /words
            // Vì auto-CRUD framework intercept /words trước
            return axiosInstance.post<WordDTO>("/dictionary/words", data).then(r => r.data);
        },
    }
);
```

### 9.2 Luồng tìm kiếm tổng thể FE→BE

```
[FE: DictionaryPage]
  │ GET /dictionary/search?q=nihongo
  ▼
[DictionaryController.search()]
  │ q = "nihongo"
  ▼
[DictionaryServiceImpl]
  │ RomajiConverter.isRomaji("nihongo") → true
  │ RomajiConverter.toHiragana("nihongo") → "にほんご"
  ▼
[DictionarySearchRepository.search("nihongo", "にほんご", pageable)]
  │ JPQL: word/reading/meaning LIKE %nihongo% OR LIKE %にほんご%
  ▼
[List<Word> entities]
  │ toResult() → WordSearchResult (with meanings, kanjis, examples)
  ▼
[Response: WordSearchResult[]]
  │
  ▼
[FE: render Word Cards]
  │ User click "Câu ví dụ Tatoeba"
  ▼
[FE: GET /dictionary/examples?word=日本語]
  │
  ▼
[TatoebaClient → https://tatoeba.org]
  ▼
[TatoebaExample[] → hiển thị trên Card]
```

---

## 10. Config cần thiết

```properties
# application.properties
forvo.api.key=${FORVO_API_KEY:}   # optional — controller trả 204 nếu rỗng, FE dùng Web Speech
# Tatoeba: không cần key, nhưng có rate limit
# Google Input Tools: không cần key, có rate limit
```

---

## 11. Phân biệt Dictionary vs Words module

| Tiêu chí | Words (`/api/words`) | Dictionary (`/api/dictionary`) |
|---|---|---|
| Mục đích | Quản trị dữ liệu (admin) | Tra cứu (end user) |
| Auth | Cần permission `WORD_READ` | Cần login (JWT) |
| Endpoint style | Auto-CRUD, paginated | Custom search-oriented |
| Response format | `Page<WordDTO>` | `WordSearchResult[]` (nested, rich) |
| External API | Không | Tatoeba, Forvo, Google Input Tools |
| Write | Full CRUD | Chỉ `POST /words` (createFull) |
| Input support | Filter fields | Kanji/kana/romaji/nghĩa mixed |