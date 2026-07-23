# Context — Module Từ vựng (Words) & Từ điển (Dictionary)

> Tài liệu mô tả ngữ cảnh hệ thống (System Context — C4 Level 1) cho hai module
> `system/words` và `system/dictionary` của ứng dụng học tiếng Nhật.
> Dùng làm input để vẽ Context Diagram.

## 1. Hệ thống trung tâm

**Japanese Learning Platform — phân hệ Từ vựng & Từ điển**
Web app (React SPA + Spring Boot REST API + RDBMS) cho phép người dùng tra cứu,
duyệt, lưu và quản trị kho từ vựng / kanji tiếng Nhật đa ngôn ngữ (nghĩa tiếng Việt
và tiếng Anh).

### Chức năng chính (gom theo nhóm)

**A. Tra từ điển (người dùng đã đăng nhập — mọi role)**
- Tìm kiếm từ vựng theo kanji, kana, **romaji** (tự chuyển romaji → hiragana) hoặc theo nghĩa; trả về từ kèm cách đọc, loại từ, JLPT level, kanji thành phần, nghĩa đa ngôn ngữ, câu ví dụ.
- Autocomplete gợi ý từ theo tiền tố khi gõ.
- Tra cứu & phân tích kanji: tìm theo ký tự / nghĩa / âm on-kun, kèm danh sách từ vựng chứa kanji đó, số nét, bộ thủ, thứ tự nét viết (animation SVG).
- Nhập liệu thay thế: **viết tay kanji** (canvas → nhận diện), **nhập giọng nói** (Web Speech API của trình duyệt).
- Nghe phát âm: audio người thật (Forvo) — nếu không có thì fallback TTS của trình duyệt.
- Câu ví dụ thực tế lấy từ Tatoeba (ưu tiên bản dịch tiếng Việt, fallback tiếng Anh).
- Trang chủ từ điển hiển thị từ vựng & kanji nổi bật (featured).
- Lịch sử tìm kiếm + tuỳ chọn hiện furigana (lưu localStorage).

**B. Từ vựng tổng hợp (browse)**
- Duyệt toàn bộ từ vựng và kanji có phân trang, lọc theo JLPT level (N5→N1).

**C. Sổ tay cá nhân (Notebook)**
- Lưu / bỏ lưu từ vựng và kanji vào sổ tay riêng của từng user (lưu DB phía server, idempotent).
- Ghi chú cá nhân cho từng mục đã lưu; xoá toàn bộ sổ tay.
- Đồng bộ các mục đã lưu offline (localStorage) lên server khi đăng nhập (merge sync).

**D. Quản trị kho từ vựng (Teacher/Admin — theo permission WORD_*, KANJI_*, …)**
- CRUD đầy đủ (tự sinh qua auto-CRUD framework) cho 9 entity: Word, Kanji, Meaning, Example, WordKanji, Language, Level, Representation, WordType.
- Tạo từ vựng "full" một lần: từ + nhiều nghĩa đa ngôn ngữ + nhiều ví dụ (endpoint riêng).
- Import / Export Excel-CSV: kho từ vựng (format riêng nhiều dòng: nghĩa + ví dụ lồng nhau, kèm file template hướng dẫn) và kho kanji (DataIO generic).

### Mô hình dữ liệu cốt lõi (tham khảo, không bắt buộc vẽ ở mức context)
- `Word` (từ, cách đọc, loại từ, tần suất) —*n:1*→ `Representation` (hệ chữ), `Level` (JLPT N5–N1)
- `Word` —*1:n*→ `Meaning` (nghĩa, mỗi nghĩa thuộc 1 `Language` vi/en), `Example` (câu ví dụ song ngữ), `WordKanji`
- `WordKanji` — bảng nối Word ↔ `Kanji`, có snapshot thông tin kanji (on/kun/nghĩa/số nét/bộ thủ)
- `Kanji` (ký tự, onyomi, kunyomi, nghĩa, JLPT, số nét, bộ thủ)
- `NotebookEntry` — mục sổ tay per-user (word hoặc kanji + ghi chú)

## 2. Actors (người dùng)

| Actor | Mô tả tương tác |
|---|---|
| **Student / Người học** (đã đăng nhập) | Tra từ, tra kanji, viết tay, nói, nghe phát âm, xem ví dụ, duyệt từ vựng theo level, lưu từ/kanji vào sổ tay, ghi chú |
| **Teacher / Content manager** | Như Student + tạo/sửa từ vựng, tạo từ full (nghĩa + ví dụ), import/export Excel-CSV kho từ & kanji |
| **Admin** | Toàn quyền CRUD trên mọi entity từ vựng + quản lý dữ liệu nền (Language, Level, Representation, WordType) |

*Lưu ý: toàn bộ API từ điển yêu cầu đăng nhập (JWT); không có truy cập khách.*

## 3. External systems (hệ thống bên ngoài)

| Hệ thống ngoài | Giao thức / cách dùng | Mục đích |
|---|---|---|
| **Tatoeba API** (tatoeba.org) | REST/JSON, backend gọi server-to-server | Lấy câu ví dụ thực tế Nhật → Việt (fallback → Anh) |
| **Forvo API** (apifree.forvo.com) | REST/JSON, backend gọi, cần API key | Lấy URL audio phát âm người thật; nếu không có key/kết quả → FE fallback TTS |
| **Google Input Tools** (google.com/inputtools) | REST/JSON, backend proxy | Nhận diện chữ viết tay kanji (strokes → ký tự ứng viên) |
| **KanjiVG CDN** (cdn.jsdelivr.net/gh/KanjiVG) | HTTPS, frontend gọi trực tiếp | File SVG thứ tự nét viết kanji (stroke order animation) |
| **Web Speech API** (trình duyệt) | Browser API, không qua mạng riêng | TTS đọc từ (fallback của Forvo) + Speech-to-text nhập giọng nói |

## 4. Quan hệ chính (gợi ý label mũi tên cho diagram)

```
Student        → System : Tra từ / tra kanji / duyệt từ vựng / lưu sổ tay & ghi chú [HTTPS/JSON, JWT]
Teacher        → System : Quản lý từ vựng, tạo từ full, import-export Excel/CSV [HTTPS/JSON, JWT]
Admin          → System : CRUD toàn bộ kho từ vựng + dữ liệu nền [HTTPS/JSON, JWT]

System → Tatoeba API        : Lấy câu ví dụ Nhật-Việt/Anh [HTTPS/JSON]
System → Forvo API          : Lấy URL audio phát âm [HTTPS/JSON, API key]
System → Google Input Tools : Nhận diện chữ viết tay kanji [HTTPS/JSON]
Browser(FE) → KanjiVG CDN   : Tải SVG thứ tự nét kanji [HTTPS]
Browser(FE) → Web Speech API: TTS phát âm + nhận giọng nói [Browser API]
```

## 5. Ghi chú phạm vi

- Phân hệ này nằm trong hệ thống lớn hơn (auth/RBAC, menu động, audit…) — ở mức
  context chỉ cần thể hiện 1 system box "Japanese Learning Platform" (hoặc riêng
  phân hệ Dictionary & Vocabulary nếu vẽ hẹp).
- Sổ tay trước đây là localStorage thuần, hiện đã **server-backed** (DB per-user);
  localStorage chỉ còn vai trò cache/offline rồi sync lên.
- Ngoài external systems trên, mọi dữ liệu từ vựng/kanji đều nằm trong database
  nội bộ của hệ thống (H2 dev / MySQL prod) — database là thành phần bên trong
  system boundary, không vẽ thành external system.