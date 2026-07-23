package com.example.starter_project_2025.system.dictionary.notebook;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.system.rbac.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Một "sổ tay" do người dùng tạo — gom các từ vựng/kanji đã lưu (kiểu Mazii:
 * người dùng có thể có nhiều sổ tay và chọn lưu từ vào sổ tay nào). Mỗi user
 * có đúng một sổ tay mặc định (isDefault = true) được tạo lười khi cần.
 *
 * KHÔNG dùng @AutoCrud: dữ liệu riêng tư theo user — mọi thao tác đi qua
 * NotebookController + NotebookService, luôn scope theo principal.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "notebooks")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class Notebook extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @Column(name = "name", nullable = false, length = 120)
    String name;

    /** Màu nhãn (token tailwind hoặc hex) — tùy chọn, để phân biệt sổ tay. */
    @Column(name = "color", length = 32)
    String color;

    /** Sổ tay mặc định — không cho xóa; là đích của các thao tác lưu nhanh. */
    @Column(name = "is_default", nullable = false)
    @Builder.Default
    Boolean isDefault = Boolean.FALSE;

    /** Thứ tự hiển thị (mặc định trước). */
    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    Integer sortOrder = 0;
}