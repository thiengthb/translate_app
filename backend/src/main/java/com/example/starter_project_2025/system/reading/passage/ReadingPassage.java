package com.example.starter_project_2025.system.reading.passage;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.FieldMeta;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

/**
 * Bài đọc hiểu do admin/teacher soạn sẵn — học viên chỉ mở ra đọc (không tự
 * dán văn bản). Đầy đủ CRUD tự sinh qua {@link AutoCrud}: admin quản lý ở
 * ProTable {@code /reading-passages}, học viên xem danh sách + đọc qua các
 * trang riêng (/reader, /reader/:id) gọi thẳng các GET endpoint tự sinh.
 *
 * <p>Không có quan hệ → chỉ cần Entity + DTO (DefaultCrudMapper/BeanUtils lo
 * phần map). {@code level} để dạng chuỗi đơn giản ("N5"…) cho khỏi phải viết
 * Mapper/Filter cho FK.
 */
@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reading_passages")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("READING_PASSAGE")
@ResourceMenu(
        title = "Bài đọc",
        group = "Language",
        icon = "file-text",
        url = "/reading-passages",
        order = 9,
        // Chỉ người có quyền tạo bài (admin) mới thấy menu quản lý này; học viên
        // dùng menu "Đọc hiểu" (/reader) do ReaderMenu sinh ra.
        permission = "READING_PASSAGE_CREATE",
        description = "Quản lý bài đọc hiểu cho học viên."
)
@Searchable(fields = {"title"})
@AutoCrud(path = "reading-passages")
public class ReadingPassage extends BaseEntity {

    @Column(name = "title", nullable = false)
    String title;

    @FieldMeta(type = "textarea", label = "Nội dung (tiếng Nhật)")
    @Column(name = "content", columnDefinition = "TEXT", nullable = false)
    String content;

    /** Cấp độ JLPT dạng chuỗi: "N5".."N1" (tùy chọn, để lọc & gắn nhãn). */
    @Column(name = "level")
    String level;

    /**
     * Chủ đề bài đọc kiểu chuyên mục báo (tùy chọn, để lọc & gắn nhãn). Lưu thẳng
     * nhãn tiếng Việt như {@code level} lưu "N5" — khỏi cần Mapper/Filter cho FK.
     * {@code enumValues} khiến form admin tự render dropdown + bộ lọc select.
     */
    @FieldMeta(label = "Chủ đề", enumValues = {
            "Đời sống", "Tự nhiên & Môi trường", "Xã hội & Pháp luật",
            "Khoa học & Công nghệ", "Văn hóa", "Sức khỏe"
    })
    @Column(name = "category")
    String category;

    /** Mô tả/giới thiệu ngắn hoặc bản dịch tóm tắt (tùy chọn). */
    @FieldMeta(type = "textarea", label = "Giới thiệu / tóm tắt")
    @Column(name = "summary", length = 1000)
    String summary;

    /**
     * Ảnh minh họa (URL). {@code type="image"} khiến form admin render ô upload
     * (lên Cloudinary qua FileController) thay vì ô text URL thường.
     */
    @FieldMeta(type = "image", label = "Ảnh minh họa")
    @Column(name = "image_url", length = 512)
    String imageUrl;

    @Column(name = "sort_order")
    Integer sortOrder;
}