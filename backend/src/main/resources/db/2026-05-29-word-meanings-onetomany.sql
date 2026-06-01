-- ============================================================================
-- Migration: Word -> Meaning đổi từ MỘT-MỘT (words.meaning_id) sang MỘT-NHIỀU
--            (meanings.word_id). Một từ vựng sở hữu nhiều nghĩa theo ngôn ngữ.
--
-- Bối cảnh: ddl-auto=update sẽ TỰ thêm cột `meanings.word_id` khi khởi động,
--           nhưng KHÔNG tự xoá/đổi cột `words.meaning_id` (đang NOT NULL) →
--           insert từ mới sẽ lỗi. Chạy script này MỘT LẦN trên MySQL TRƯỚC khi
--           chạy backend bản mới (hoặc ngay sau lần khởi động đầu nếu Hibernate
--           đã thêm cột word_id ở dạng nullable).
--
-- ⚠️ Nếu một `meaning` đang dùng chung cho nhiều `word` thì bước backfill chỉ
--    giữ lại MỘT liên kết. Kiểm tra trước:
--      SELECT meaning_id, COUNT(*) FROM words GROUP BY meaning_id HAVING COUNT(*) > 1;
--    Nếu có, hãy nhân bản nghĩa cho từng từ trước khi chạy.
-- ============================================================================

-- 1) Thêm cột word_id (bỏ qua nếu Hibernate đã tạo).
ALTER TABLE meanings ADD COLUMN word_id BIGINT NULL;

-- 2) Backfill: mỗi nghĩa thuộc về đúng từ đang trỏ tới nó.
UPDATE meanings m
JOIN words w ON w.meaning_id = m.id
SET m.word_id = w.id;

-- 3) Gỡ ràng buộc cũ trên bảng words.
ALTER TABLE words DROP FOREIGN KEY fk_words_meaning;
ALTER TABLE words DROP COLUMN meaning_id;

-- 4) Siết NOT NULL + FK cho quan hệ mới.
ALTER TABLE meanings MODIFY word_id BIGINT NOT NULL;
ALTER TABLE meanings
    ADD CONSTRAINT fk_meanings_word FOREIGN KEY (word_id) REFERENCES words (id);