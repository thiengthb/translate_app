package com.example.starter_project_2025.system.dictionary.notebook;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.words.kanji.Kanji;
import com.example.starter_project_2025.system.words.word.Word;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Một mục trong một "Sổ tay": hoặc một từ vựng, hoặc một kanji (đúng một
 * trong hai cột word_id / kanji_id có giá trị), kèm ghi chú cá nhân. Mục
 * thuộc về một Notebook cụ thể (notebook_id); cùng một từ có thể nằm trong
 * nhiều sổ tay khác nhau của cùng người dùng.
 *
 * KHÔNG dùng @AutoCrud: đây là dữ liệu riêng tư theo user — endpoint generic
 * (list/create không lọc theo user, yêu cầu permission NOTEBOOK_*) không phù hợp.
 * CRUD đi qua NotebookController + NotebookService, luôn scope theo principal
 * (cùng pattern với Streak).
 *
 * Xóa mục là HARD delete (không soft-delete) để không vướng unique constraint
 * (notebook_id, word_id) khi người dùng bỏ lưu rồi lưu lại cùng một từ.
 * Giữ thêm user_id (denormalize) để truy vấn "đã lưu ở bất kỳ sổ tay nào" và
 * scope theo principal mà không phải join qua notebook.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notebook_entries", uniqueConstraints = {
        @UniqueConstraint(name = "uq_notebook_entry_word",  columnNames = {"notebook_id", "word_id"}),
        @UniqueConstraint(name = "uq_notebook_entry_kanji", columnNames = {"notebook_id", "kanji_id"}),
})
@FieldDefaults(level = AccessLevel.PRIVATE)
public class NotebookEntry extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "notebook_id", nullable = false)
    Notebook notebook;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "word_id")
    Word word;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kanji_id")
    Kanji kanji;

    /** Ghi chú cá nhân của người dùng cho mục này (tùy chọn). */
    @Column(columnDefinition = "TEXT")
    String note;
}