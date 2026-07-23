# Use Case Diagram — Chức năng Từ điển (Dictionary / Words)

Tài liệu mô tả use case cho module từ điển, tổng hợp từ:

- **Backend**: `system/dictionary/` (DictionaryController, NotebookController), `system/words/` (Word, Meaning, Example, Kanji, Language, Level, Representation, WordType, WordKanji — auto-CRUD), `system/analyze/` (SudachiTokenizer)
- **Frontend**: `pages/dictionary/` (DictionaryPage, VocabularyBrowsePage, NotebookPage, WordCreatePage), `pages/analyze/AnalyzePage`

## Actor

| Actor | Mô tả |
|---|---|
| **Guest** | Người dùng chưa đăng nhập. Mọi endpoint `/api/dictionary/*` (trừ notebook) đều public. Sổ tay chỉ lưu localStorage. |
| **User (Student)** | Đã đăng nhập. Kế thừa toàn bộ Guest + sổ tay đồng bộ server + phân tích câu. |
| **Teacher/Admin** | Kế thừa User + quản trị dữ liệu từ điển (CRUD, import/export) theo permission `WORD_*`, `KANJI_*`, ... |
| **Tatoeba** (external) | API câu ví dụ thực tế. |
| **Forvo** (external) | API âm thanh phát âm (fallback TTS). |
| **Google Input Tools** (external) | API nhận dạng chữ viết tay kanji. |

## PlantUML

```plantuml
@startuml dictionary-use-case
left to right direction
skinparam packageStyle rectangle
skinparam actorStyle awesome
skinparam usecase {
  BackgroundColor #FDF6E3
  BorderColor #657B83
}

actor "Guest" as Guest
actor "User\n(Student)" as User
actor "Teacher / Admin" as Admin
actor "Tatoeba API" as Tatoeba <<external>>
actor "Forvo API" as Forvo <<external>>
actor "Google Input Tools" as GIT <<external>>

User --|> Guest
Admin --|> User

rectangle "Hệ thống Từ điển" {

  ' ===== Tra cứu (public) =====
  package "Tra cứu từ điển" {
    usecase "Tra cứu từ vựng\n(kanji/kana/romaji/nghĩa)" as UC_Search
    usecase "Gợi ý tự động\n(autocomplete)" as UC_Suggest
    usecase "Tra cứu Kanji" as UC_KanjiSearch
    usecase "Duyệt từ vựng theo\ncấp độ JLPT (N5–N1)" as UC_BrowseWords
    usecase "Duyệt Kanji theo\ncấp độ JLPT" as UC_BrowseKanji
    usecase "Xem từ / Kanji nổi bật" as UC_Featured
    usecase "Xem câu ví dụ thực tế" as UC_Examples
    usecase "Nghe phát âm" as UC_Audio
    usecase "Nhập bằng chữ viết tay" as UC_Handwriting
    usecase "Nhập bằng giọng nói" as UC_Voice
    usecase "Xem thứ tự nét &\nbộ thủ Kanji" as UC_Stroke
    usecase "Bật/tắt furigana" as UC_Furigana
    usecase "Xem lịch sử tìm kiếm" as UC_History
    usecase "Chuyển đổi romaji → kana" as UC_Romaji
  }

  ' ===== Phân tích câu =====
  package "Phân tích câu" {
    usecase "Phân tích câu tiếng Nhật\n(tách từ, loại từ, cách đọc)" as UC_Analyze
    usecase "Đọc văn bản (TTS)" as UC_TTS
  }

  ' ===== Sổ tay =====
  package "Sổ tay cá nhân" {
    usecase "Lưu từ vào sổ tay" as UC_SaveWord
    usecase "Lưu Kanji vào sổ tay" as UC_SaveKanji
    usecase "Xem sổ tay" as UC_ViewNotebook
    usecase "Ghi chú cá nhân\ncho mục đã lưu" as UC_Note
    usecase "Xóa mục / xóa toàn bộ\nsổ tay" as UC_RemoveEntry
    usecase "Đồng bộ sổ tay offline\n(localStorage ↔ server)" as UC_Sync
    usecase "Lưu sổ tay cục bộ\n(localStorage)" as UC_LocalSave
  }

  ' ===== Quản trị =====
  package "Quản trị dữ liệu từ điển" {
    usecase "Tạo từ mới kèm nghĩa\n& ví dụ (composite)" as UC_CreateWord
    usecase "Quản lý từ vựng (CRUD)" as UC_ManageWord
    usecase "Quản lý nghĩa (CRUD)" as UC_ManageMeaning
    usecase "Quản lý câu ví dụ (CRUD)" as UC_ManageExample
    usecase "Quản lý Kanji (CRUD)" as UC_ManageKanji
    usecase "Quản lý danh mục\n(Language / Level /\nRepresentation / WordType)" as UC_ManageLookup
    usecase "Export từ vựng\n(Excel/CSV)" as UC_Export
    usecase "Import từ vựng\n(Excel/CSV)" as UC_Import
    usecase "Tải template import" as UC_Template
  }
}

' ===== Guest associations =====
Guest --> UC_Search
Guest --> UC_KanjiSearch
Guest --> UC_BrowseWords
Guest --> UC_BrowseKanji
Guest --> UC_Featured
Guest --> UC_Examples
Guest --> UC_Audio
Guest --> UC_Handwriting
Guest --> UC_Voice
Guest --> UC_Stroke
Guest --> UC_Furigana
Guest --> UC_History
Guest --> UC_LocalSave
Guest --> UC_TTS

' ===== User associations =====
User --> UC_Analyze
User --> UC_SaveWord
User --> UC_SaveKanji
User --> UC_ViewNotebook
User --> UC_Note
User --> UC_RemoveEntry
User --> UC_Sync

' ===== Admin associations =====
Admin --> UC_CreateWord
Admin --> UC_ManageWord
Admin --> UC_ManageMeaning
Admin --> UC_ManageExample
Admin --> UC_ManageKanji
Admin --> UC_ManageLookup
Admin --> UC_Export
Admin --> UC_Import
Admin --> UC_Template

' ===== include / extend =====
UC_Search ..> UC_Romaji : <<include>>
UC_Suggest .> UC_Search : <<extend>>
UC_History .> UC_Search : <<extend>>
UC_Handwriting .> UC_KanjiSearch : <<extend>>
UC_Voice .> UC_Search : <<extend>>
UC_Examples ..> UC_Search : <<extend>>
UC_Audio ..> UC_Search : <<extend>>
UC_Stroke ..> UC_KanjiSearch : <<extend>>
UC_KanjiSearch ..> UC_Search : <<include>> : tra chéo qua từ
UC_SaveWord .> UC_Search : <<extend>>
UC_SaveKanji .> UC_KanjiSearch : <<extend>>
UC_Note ..> UC_ViewNotebook : <<extend>>
UC_Sync ..> UC_LocalSave : <<include>>
UC_TTS ..> UC_Analyze : <<extend>>
UC_CreateWord ..> UC_ManageMeaning : <<include>>
UC_CreateWord ..> UC_ManageExample : <<include>>
UC_Import ..> UC_Template : <<extend>>

' ===== External systems =====
UC_Examples --> Tatoeba
UC_Audio --> Forvo
UC_Handwriting --> GIT

@enduml
```

## Diagram rút gọn (bản trình bày / báo cáo)

Bản đầy đủ ở trên khá dày; nếu cần đưa vào slide/báo cáo, dùng bản gom nhóm này:

```plantuml
@startuml dictionary-use-case-simple
left to right direction
skinparam actorStyle awesome

actor Guest
actor "User (Student)" as User
actor "Teacher / Admin" as Admin

User --|> Guest
Admin --|> User

rectangle "Hệ thống Từ điển" {
  usecase "Tra cứu từ vựng / Kanji\n(text, viết tay, giọng nói)" as UC1
  usecase "Duyệt từ vựng & Kanji\ntheo cấp độ JLPT" as UC2
  usecase "Xem chi tiết từ\n(nghĩa, ví dụ, phát âm,\nnét viết, bộ thủ)" as UC3
  usecase "Phân tích câu tiếng Nhật" as UC4
  usecase "Quản lý sổ tay cá nhân\n(lưu từ/kanji, ghi chú,\nđồng bộ offline)" as UC5
  usecase "Quản trị dữ liệu từ điển\n(CRUD từ, nghĩa, ví dụ, kanji,\ndanh mục)" as UC6
  usecase "Import / Export từ vựng\n(Excel, CSV)" as UC7
}

Guest --> UC1
Guest --> UC2
Guest --> UC3
User --> UC4
User --> UC5
Admin --> UC6
Admin --> UC7

UC3 .> UC1 : <<extend>>
UC5 .> UC1 : <<extend>>
UC7 .> UC6 : <<extend>>
@enduml
```

## Bảng ánh xạ Use case ↔ Endpoint

| Use case | Endpoint | Quyền |
|---|---|---|
| Tra cứu từ vựng | `GET /api/dictionary/search` | Public |
| Gợi ý tự động | `GET /api/dictionary/suggest` | Public |
| Tra cứu Kanji | `GET /api/dictionary/kanji-search` | Public |
| Duyệt từ vựng | `GET /api/dictionary/browse/words` | Public |
| Duyệt Kanji | `GET /api/dictionary/browse/kanjis` | Public |
| Từ/Kanji nổi bật | `GET /api/dictionary/featured` | Public |
| Câu ví dụ thực tế | `GET /api/dictionary/examples` (→ Tatoeba) | Public |
| Nghe phát âm | `GET /api/dictionary/audio` (→ Forvo / TTS) | Public |
| Nhận dạng chữ viết tay | `POST /api/dictionary/handwriting` (→ Google Input Tools) | Public |
| Phân tích câu | `POST /api/analyze` (Sudachi) | Đăng nhập |
| Xem sổ tay | `GET /api/dictionary/notebook` | Đăng nhập |
| Lưu / xóa từ trong sổ tay | `POST/DELETE /api/dictionary/notebook/words/{wordId}` | Đăng nhập |
| Lưu / xóa kanji trong sổ tay | `POST/DELETE /api/dictionary/notebook/kanjis/{character}` | Đăng nhập |
| Ghi chú cá nhân | `PUT /api/dictionary/notebook/entries/{entryId}/note` | Đăng nhập |
| Xóa toàn bộ sổ tay | `DELETE /api/dictionary/notebook` | Đăng nhập |
| Đồng bộ offline | `POST /api/dictionary/notebook/sync` | Đăng nhập |
| Tạo từ composite | `POST /api/dictionary/words` | `WORD_CREATE` |
| CRUD từ vựng | `/api/words/*` (auto-CRUD) | `WORD_*` |
| CRUD nghĩa | `/api/meanings/*` (auto-CRUD) | `MEANING_*` |
| CRUD ví dụ | `/api/examples/*` (auto-CRUD) | `EXAMPLE_*` |
| CRUD Kanji | `/api/kanjis/*` (auto-CRUD) | `KANJI_*` |
| CRUD danh mục | `/api/languages`, `/api/levels`, `/api/representations`, `/api/word-types` | `LANGUAGE_*`, `LEVEL_*`, ... |
| Export từ vựng | `GET /api/dictionary/words/export` | `WORD_READ` |
| Import từ vựng | `POST /api/dictionary/words/import` | `WORD_CREATE` |
| Tải template | `GET /api/dictionary/words/template` | `WORD_CREATE` |

## Ghi chú thiết kế

- **Guest dùng được gần như toàn bộ tra cứu**: mọi endpoint `/api/dictionary/*` (trừ `notebook`) đều nằm trong `PUBLIC_ENDPOINTS` của `SecurityConfig`. Sổ tay của Guest chỉ lưu localStorage (`dict_saved_words`, `dict_saved_kanjis`) — khi đăng nhập sẽ merge lên server qua `POST /notebook/sync`.
- **Tra cứu Kanji include tra cứu từ**: `DictionaryServiceImpl.searchKanji` có chiến lược 3 bước — tra trực tiếp ký tự → tra keyword → tra chéo qua kết quả tìm từ (vd nhập romaji "seijin" → tìm ra 成人 → tách 成, 人).
- **Sổ tay scoped theo user**: `NotebookController` luôn lấy `principal.getId()`, client không truyền userId — không có truy cập chéo người dùng.
- **Quản trị qua auto-CRUD**: các entity Word/Meaning/Example/Kanji/... gắn `@AutoCrud` + `@ResourcePermission`, endpoint sinh tự động, không có controller riêng (xem [[words-autocrud-no-controllers]] trong memory).