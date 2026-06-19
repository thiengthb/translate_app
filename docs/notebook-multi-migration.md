# Sổ tay đa sổ tay (multi-notebook) — migration

Tính năng cho phép người dùng tạo **nhiều sổ tay** và chọn lưu từ/kanji vào sổ
tay nào (kiểu Mazii). Thay đổi schema so với bản sổ tay đơn cũ.

## Thay đổi schema

- **Bảng mới `notebooks`**: `id, user_id, name, color, is_default, sort_order` + cột BaseEntity (`created_at, updated_at, is_active, is_deleted, version`).
- **`notebook_entries`**: thêm cột `notebook_id` (FK → `notebooks`).
- Unique constraint đổi từ `(user_id, word_id)` / `(user_id, kanji_id)` sang
  `(notebook_id, word_id)` / `(notebook_id, kanji_id)` — một từ có thể nằm trong
  nhiều sổ tay khác nhau của cùng người dùng.
- Vẫn giữ `user_id` trên `notebook_entries` (denormalize) cho truy vấn
  "đã lưu ở bất kỳ sổ tay nào" + scope theo principal.

## Dev (H2 in-memory)

Không cần làm gì — DB tạo lại từ entity mỗi lần khởi động.

## Prod (MySQL, `ddl-auto=update`)

`ddl-auto=update` tự tạo bảng `notebooks` nhưng **không** tự (a) thêm cột
`notebook_id` NOT NULL khi bảng đã có dữ liệu, và (b) bỏ unique constraint cũ.
Chạy migration thủ công sau (idempotent-ish — kiểm tra tên constraint thực tế
bằng `SHOW CREATE TABLE notebook_entries;` trước khi drop):

```sql
-- 1) Tạo bảng notebooks (nếu ddl-auto chưa tạo)
CREATE TABLE IF NOT EXISTS notebooks (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    name        VARCHAR(120) NOT NULL,
    color       VARCHAR(32)  NULL,
    is_default  BIT          NOT NULL DEFAULT 0,
    sort_order  INT          NOT NULL DEFAULT 0,
    created_at  DATETIME(6)  NULL,
    updated_at  DATETIME(6)  NULL,
    is_active   BIT          NULL,
    is_deleted  BIT          NULL,
    version     BIGINT       NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_notebooks_user FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 2) Thêm cột notebook_id (nullable tạm để backfill)
ALTER TABLE notebook_entries ADD COLUMN notebook_id BIGINT NULL;

-- 3) Tạo một sổ tay mặc định cho mỗi user đang có mục đã lưu
INSERT INTO notebooks (user_id, name, is_default, sort_order, is_active, is_deleted, version, created_at, updated_at)
SELECT DISTINCT e.user_id, N'Sổ tay của tôi', 1, 0, 1, 0, 0, NOW(6), NOW(6)
FROM notebook_entries e
WHERE NOT EXISTS (SELECT 1 FROM notebooks n WHERE n.user_id = e.user_id AND n.is_default = 1);

-- 4) Gán mọi mục cũ vào sổ tay mặc định của user
UPDATE notebook_entries e
JOIN notebooks n ON n.user_id = e.user_id AND n.is_default = 1
SET e.notebook_id = n.id
WHERE e.notebook_id IS NULL;

-- 5) Bỏ unique constraint cũ (tên có thể khác — xem SHOW CREATE TABLE)
ALTER TABLE notebook_entries DROP INDEX uq_notebook_user_word;
ALTER TABLE notebook_entries DROP INDEX uq_notebook_user_kanji;

-- 6) Ràng buộc mới
ALTER TABLE notebook_entries MODIFY notebook_id BIGINT NOT NULL;
ALTER TABLE notebook_entries
    ADD CONSTRAINT fk_notebook_entries_notebook FOREIGN KEY (notebook_id) REFERENCES notebooks(id);
ALTER TABLE notebook_entries
    ADD CONSTRAINT uq_notebook_entry_word  UNIQUE (notebook_id, word_id);
ALTER TABLE notebook_entries
    ADD CONSTRAINT uq_notebook_entry_kanji UNIQUE (notebook_id, kanji_id);
```

## API

- `GET    /api/dictionary/notebooks`                         — danh sách sổ tay (kèm số mục)
- `POST   /api/dictionary/notebooks`                         — tạo `{name, color?}`
- `PUT    /api/dictionary/notebooks/{id}`                    — đổi tên/màu
- `DELETE /api/dictionary/notebooks/{id}`                    — xóa (chặn sổ tay mặc định)
- `GET    /api/dictionary/notebooks/{id}/entries`            — mục trong một sổ tay
- `POST   /api/dictionary/notebooks/{id}/words/{wordId}`     — thêm từ
- `DELETE /api/dictionary/notebooks/{id}/words/{wordId}`     — bỏ từ
- `POST   /api/dictionary/notebooks/{id}/kanjis/{character}` — thêm kanji
- `DELETE /api/dictionary/notebooks/{id}/kanjis/{character}` — bỏ kanji
- `GET    /api/dictionary/notebooks/membership/word/{wordId}` — id các sổ tay chứa từ (cho picker)
- `GET    /api/dictionary/notebooks/membership/kanji/{character}`

Tương thích ngược (gộp xuyên mọi sổ tay — cho trạng thái bookmark/sync):
- `GET /api/dictionary/notebook` (aggregate, loại trùng), `POST/DELETE /notebook/words|kanjis/...`
  (lưu nhanh vào / bỏ khỏi mặc định), `PUT /notebook/entries/{id}/note`, `DELETE /notebook` (xóa hết mục),
  `POST /notebook/sync`.