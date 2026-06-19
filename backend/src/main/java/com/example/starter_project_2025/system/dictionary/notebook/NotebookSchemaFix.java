package com.example.starter_project_2025.system.dictionary.notebook;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Đa sổ tay đổi unique constraint của notebook_entries từ (user_id, word_id)/
 * (user_id, kanji_id) sang (notebook_id, word_id)/(notebook_id, kanji_id).
 * Với ddl-auto=update (MySQL prod/dev), Hibernate THÊM constraint mới nhưng
 * KHÔNG bỏ constraint cũ → cái cũ chặn việc lưu cùng một từ vào sổ tay thứ 2.
 *
 * Runner này bỏ index cũ nếu còn (idempotent — no-op sau lần đầu / trên schema
 * mới hoàn toàn như H2 in-memory). Mọi thao tác bọc try/catch để không chặn
 * khởi động nếu DB không hỗ trợ truy vấn information_schema.
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class NotebookSchemaFix implements ApplicationRunner {

    private static final String TABLE = "notebook_entries";
    private static final String[] LEGACY_INDEXES = {"uq_notebook_user_word", "uq_notebook_user_kanji"};

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        for (String index : LEGACY_INDEXES) {
            try {
                if (indexExists(index)) {
                    jdbcTemplate.execute("ALTER TABLE " + TABLE + " DROP INDEX " + index);
                    log.info("[NotebookSchemaFix] Đã bỏ unique index cũ '{}' trên {} (đa sổ tay).", index, TABLE);
                }
            } catch (Exception e) {
                log.warn("[NotebookSchemaFix] Bỏ index '{}' thất bại (có thể đã không tồn tại): {}",
                        index, e.getMessage());
            }
        }
    }

    private boolean indexExists(String indexName) {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.statistics " +
                            "WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
                    Integer.class, TABLE, indexName);
            return count != null && count > 0;
        } catch (Exception e) {
            // DB không có information_schema.statistics (vd H2) → coi như không có.
            return false;
        }
    }
}