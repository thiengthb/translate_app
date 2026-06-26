# Module Words — Tài liệu kỹ thuật

Module quản lý từ vựng tiếng Nhật (CRUD thuần). Là **data layer** cung cấp dữ liệu cho module Dictionary.

---

## 1. Cấu trúc package

```
system/words/
├── word/           ← Word entity — trung tâm của module
├── mean/           ← Meaning — nghĩa của từ (đa ngôn ngữ)
├── example/        ← Example — câu ví dụ song ngữ
├── kanji/          ← Kanji — thư viện chữ Hán
├── word_kanji/     ← WordKanji — junction Word ↔ Kanji (có denormalized data)
├── language/       ← Language — bảng ngôn ngữ tham chiếu (vi, ja, en...)
├── level/          ← Level — cấp độ JLPT (N5–N1)
├── representation/ ← Representation — dạng chữ (KANJI, HIRAGANA, KATAKANA, MIXED)
└── word_type/      ← WordType — loại từ (danh từ, động từ, tính từ...)
```

---

## 2. Domain Model & Quan hệ

### Sơ đồ quan hệ

```
representations ──< words >── levels
                      │
          ┌───────────┼───────────┐
          ↓           ↓           ↓
       meanings    examples   word_kanjis
          │           │  │         │
       languages  lang lang      kanjis
                 (root)(to)
```

### Chi tiết từng entity

#### `Word` — bảng `words`

| Column | Type | Mô tả |
|---|---|---|
| id | Long (PK) | Auto-generated |
| word | String (NOT NULL) | Từ gốc tiếng Nhật |
| reading | String | Cách đọc (hiragana/katakana) |
| word_type | String | Loại từ (noun, verb, adj...) |
| frequency | Integer | Tần suất xuất hiện (số nhỏ = phổ biến hơn) |
| representation_id | FK → representations | Dạng chữ viết |
| level_id | FK → levels | Cấp độ JLPT |

Quan hệ:
- `@ManyToOne(LAZY)` → `Representation` (bắt buộc)
- `@ManyToOne(LAZY)` → `Level` (bắt buộc)
- `@OneToMany(cascade=ALL, orphanRemoval=true)` → `Meaning` — xóa Word → xóa hết meanings
- `@OneToMany(cascade=ALL, orphanRemoval=true)` → `Example` — xóa Word → xóa hết examples
- `@OneToMany(cascade=ALL)` → `WordKanji` — không có orphanRemoval (cố ý giữ link kanji)

`@BatchSize(size=30)` trên `meanings` — Hibernate load tối đa 30 nghĩa mỗi lô, tránh N+1 query khi lấy danh sách từ.

#### `Meaning` — bảng `meanings`

| Column | Type | Mô tả |
|---|---|---|
| word_id | FK → words | Từ sở hữu nghĩa này |
| language_id | FK → languages | Ngôn ngữ của nghĩa |
| name | TEXT (NOT NULL) | Nội dung nghĩa |

Một từ có thể có nhiều nghĩa bằng nhiều ngôn ngữ. Ví dụ: "語" có nghĩa "ngôn ngữ" (vi) và "language" (en).

#### `Example` — bảng `examples`

| Column | Type | Mô tả |
|---|---|---|
| word_id | FK → words | Từ liên quan |
| root_language_id | FK → languages | Ngôn ngữ gốc của câu ví dụ |
| to_language_id | FK → languages | Ngôn ngữ dịch |
| root_example | String | Câu ví dụ ngôn ngữ gốc |
| to_example | String | Câu dịch |

`languages` được tham chiếu 2 lần (2 FK khác nhau) — đây là lý do `ExampleMapper` phải viết MapStruct riêng.

#### `Kanji` — bảng `kanjis`

| Column | Type | Mô tả |
|---|---|---|
| kanji_char | String (UNIQUE) | Ký tự kanji (vd: 語) |
| onyomi | TEXT | Âm On (Hán âm) |
| kunyomi | TEXT | Âm Kun (Nhật âm thuần) |
| meaning | TEXT | Nghĩa tiếng Anh/Việt |
| jlpt_level | String | Cấp độ JLPT |
| stroke | Integer | Số nét |
| radical | String | Bộ thủ |

`KanjiRepository` có 2 query đặc biệt:
- `searchByKeyword(likeQ, likeKana)` — tìm theo character/meaning/onyomi/kunyomi, ưu tiên JLPT level thấp (dễ hơn)
- `findFeaturedKanjis()` — lấy danh sách kanji sắp theo JLPT rồi stroke count, dùng cho trang chủ

#### `WordKanji` — bảng `word_kanjis`

Junction table giữa `Word` và `Kanji`, nhưng là entity riêng vì lưu thêm **denormalized data**:

| Column | Mô tả |
|---|---|
| word_id | FK → words |
| kanji_id | FK → kanjis |
| kanji_char | Bản sao ký tự kanji |
| onyomi, kunyomi | Bản sao cách đọc |
| meaning | Bản sao nghĩa |
| stroke, radical | Bản sao số nét và bộ thủ |

Lý do denormalize: tránh phải JOIN vào bảng `kanjis` mỗi lần đọc từ. Kanji trong một từ cụ thể có thể có cách dùng/nghĩa khác với bảng kanji tổng quát.

`WordKanjiRepository` có query đặc biệt:
```java
@Query("SELECT wk FROM WordKanji wk JOIN FETCH wk.word w 
        WHERE wk.character = :char AND w.isDeleted = false 
        ORDER BY w.frequency ASC")
List<WordKanji> findByCharacterWithWords(String character, Pageable pageable);
```
Dùng để tìm tất cả từ có chứa một kanji cụ thể, sắp xếp theo tần suất.

#### `Language` — bảng `languages`

| Column | Mô tả |
|---|---|
| code | Unique (max 10 chars): ja, vi, en, zh, ko... |
| name | Tên hiển thị |

#### `Level` — bảng `levels`

Seed: N5 (Sơ cấp), N4, N3, N2, N1 (Cao cấp).

#### `Representation` — bảng `representations`

Seed: KANJI (Chữ Hán), HIRAGANA, KATAKANA, MIXED (Hỗn hợp).

#### `WordType` — bảng `word_types`

Lookup table cho loại từ: danh từ, động từ, tính từ... Có `@Searchable(fields = {"name", "code", "description"})`.

---

## 3. Backend — Auto-CRUD

Tất cả entities đều có `@AutoCrud(path = "...")` → framework tự đăng ký endpoints:

```
GET    /api/words?page=0&size=20&word=xxx&levelId=1   ← filter + paginate
GET    /api/words/{id}
POST   /api/words
PUT    /api/words/{id}
DELETE /api/words/{id}
POST   /api/words/bulk-delete
GET    /api/words/export
POST   /api/words/import
```

Tương tự cho `/api/kanjis`, `/api/meanings`, `/api/examples`, `/api/word-kanjis`, `/api/languages`, `/api/levels`, `/api/representations`, `/api/word-types`.

---

## 4. `WordServiceImpl` — Hook vào auto-CRUD

```java
public class WordServiceImpl
        extends BaseCrudServiceImpl<Word, Long, WordDTO, WordFilter>
        implements WordService {

    @Override
    protected void beforeCreate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);  // gán Representation + Level từ ID
    }

    @Override
    protected void beforeUpdate(Word entity, WordDTO request, ValidationContext ctx) {
        resolveRelations(entity, request);
    }

    private void resolveRelations(Word entity, WordDTO request) {
        if (request.getRepresentationId() != null)
            entity.setRepresentation(representationRepository.findById(...).orElseThrow(...));
        if (request.getLevelId() != null)
            entity.setLevel(levelRepository.findById(...).orElseThrow(...));
    }
}
```

`BaseCrudServiceImpl` xử lý toàn bộ save/find/delete/paginate. `WordServiceImpl` chỉ override 2 hook để resolve relation (ID → Entity). Đây là **pattern chuẩn** của framework.

`searchableFields()` trả về `["word", "reading", "wordType"]` → khi có param `search=xxx` trên URL, framework tự build LIKE query trên 3 field này.

---

## 5. `WordMapper` — Mapping đặc biệt

```java
@Mapper(componentModel = "spring", uses = MeaningMapper.class)
public interface WordMapper extends BaseCrudMapper<Word, WordDTO> {

    @Mapping(target = "representation.id", source = "representationId")
    @Mapping(target = "meanings", ignore = true)   // resolve riêng ở service
    @Mapping(target = "level.id", source = "levelId")
    Word toEntity(WordDTO dto);

    @Mapping(target = "representationId",   source = "representation.id")
    @Mapping(target = "representationName", source = "representation.name")
    @Mapping(target = "levelId",            source = "level.id")
    @Mapping(target = "levelName",          source = "level.name")
    @Mapping(target = "meaningText",
             expression = "java(primaryMeaningText(entity.getMeanings()))")
    WordDTO toResponse(Word entity);

    default String primaryMeaningText(List<Meaning> meanings) {
        // Ưu tiên tiếng Việt (vi/vie), fallback về nghĩa đầu tiên
        return meanings.stream()
            .filter(m -> "vi".equalsIgnoreCase(m.getLanguage().getCode())
                      || "vie".equalsIgnoreCase(m.getLanguage().getCode()))
            .map(Meaning::getName)
            .findFirst()
            .orElse(meanings.get(0).getName());
    }
}
```

`meaningText` là field **computed** — không lưu DB, được tính mỗi lần response. Logic ưu tiên vi/vie để UI luôn hiển thị nghĩa tiếng Việt nếu có.

`meanings` bị `ignore = true` trong `toEntity` vì danh sách nghĩa được quản lý riêng qua `createFull()` hoặc trực tiếp qua `/api/meanings`.

---

## 6. `WordCreateRequest` + `createFull()` — Tạo gộp 1 transaction

Endpoint đặc biệt nằm ở `DictionaryController` (`POST /api/dictionary/words`) để tạo Word + nhiều Meanings + nhiều Examples trong **1 transaction**:

```java
WordCreateRequest {
    // Word info
    word*, reading, wordType, frequency
    representationId*, levelId*

    // Meanings (bắt buộc ít nhất 1)
    List<MeaningInput> meanings  →  [{ languageId*, name* }]

    // Examples (optional)
    List<ExampleInput> examples  →  [{ rootLanguageId*, toLanguageId*, rootExample*, toExample }]
}
```

Flow trong `WordServiceImpl.createFull()`:
1. Resolve `Representation` và `Level` từ ID
2. Build `Word` entity với `meanings = []` và `examples = []`
3. Với mỗi `MeaningInput`: resolve `Language` → tạo `Meaning` → add vào `word.getMeanings()`
4. Với mỗi `ExampleInput`: resolve 2 `Language` → tạo `Example` → add vào `word.getExamples()`
5. `wordRepository.save(word)` — JPA cascade tự save toàn bộ meanings và examples con

Lý do endpoint này nằm ở `/dictionary/words` chứ không phải `/words`: nếu POST vào `/api/words` thì auto-CRUD của framework sẽ xử lý trước, bỏ qua logic tạo gộp.

---

## 7. Pattern cho lookup entities (Language, Level, Representation, WordType)

Tất cả theo cùng một cấu trúc 6 file:

```
EntityServiceImpl
  └── beforeCreate(ctx): if (repo.existsByCode(code)) ctx.reject("code", "already exists")
  └── beforeUpdate(ctx): if (repo.existsByCodeAndIdNot(code, id)) ctx.reject(...)
```

Chỉ có duy nhất một business logic: **validate unique code**. Không có gì khác.

---

## 8. Frontend — API Layer

```
frontend/src/api/features/words/
├── word.api.ts        ← CRUD + createFull() → POST /dictionary/words
├── kanji.api.ts       ← CRUD chuẩn /kanjis
├── meaning.api.ts     ← CRUD chuẩn /meanings
├── example.api.ts     ← CRUD chuẩn /examples
├── word_kanji.api.ts  ← CRUD chuẩn /word-kanjis
├── language.api.ts    ← CRUD chuẩn /languages
├── level.api.ts       ← CRUD chuẩn /levels
├── representation.api.ts ← CRUD chuẩn /representations
└── wordType.api.ts    ← CRUD chuẩn /word-types
```

`word.api.ts` đặc biệt hơn — dùng `Object.assign` để extend base service với method `createFull`:

```typescript
export const wordApi = Object.assign(
    {},
    createBaseApiService<WordDTO, WordFilter>({ path: "/words" }),
    {
        createFull: async (data: WordCreateRequest): Promise<WordDTO> =>
            axiosInstance.post<WordDTO>("/dictionary/words", data).then(r => r.data),
    }
);
```

---

## 9. Frontend — Entity Schema (Management Pages)

```
frontend/src/pages/management/words/
├── word/index.tsx        ← Schema bảng Words
├── kanji/index.tsx       ← Schema bảng Kanjis
├── meaning/index.tsx     ← Schema bảng Meanings
├── example/index.tsx     ← Schema bảng Examples
├── word_kanji/index.tsx  ← Schema bảng Word-Kanjis
├── language/index.tsx    ← Schema bảng Languages
├── level/index.tsx       ← Schema bảng Levels
├── representation/index.tsx ← Schema bảng Representations
└── word_type/index.tsx   ← Schema bảng Word Types
```

Mỗi file export `entityConfig: EntityConfig` — ProTable đọc config này để tự render bảng, form, filter.

Schema của `word/index.tsx` có 2 điểm đặc biệt:
- `meaningText` có `editable: false` — field computed, chỉ hiển thị, không cho sửa trong form
- `createRoute: "/words/create"` — override route tạo mặc định sang form tùy chỉnh (nhập nhiều meanings/examples)

Các field `representationId` và `levelId` dùng `type: "relation"` — ProTable tự render Select box, gọi API để lấy danh sách options.

---

## 10. Known Gotchas

| # | Vấn đề | Giải thích |
|---|---|---|
| 1 | `WordKanji` có data trùng với `Kanji` | Intentional denormalization — tránh JOIN, kanji trong từ có thể có context riêng |
| 2 | `meanings` có `orphanRemoval=true` | Xóa Word → xóa hết Meanings và Examples theo |
| 3 | `WordKanji` không có `orphanRemoval` | Cố ý — link kanji được giữ lại khi cần audit |
| 4 | `createFull` không dùng `/api/words` | Auto-CRUD của framework sẽ intercept, mất logic tạo gộp |
| 5 | `meaningText` trong `WordDTO` | Chỉ là nghĩa chính để hiển thị nhanh, không phải tất cả nghĩa |
| 6 | `@BatchSize(size=30)` trên `meanings` | Tránh N+1 query khi load danh sách từ |
| 7 | `WordFilter` cần `@NoArgsConstructor @AllArgsConstructor` | Jackson cần no-args ctor để deserialize filter từ request params |