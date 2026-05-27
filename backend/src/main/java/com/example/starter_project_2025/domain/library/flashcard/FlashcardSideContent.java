package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.annotation.AuditEnabled;
import com.example.starter_project_2025.base.annotation.SoftDelete;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.util.Map;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(
        name = "flashcard_side_contents",
        indexes = @Index(name = "idx_side_order", columnList = "side_id, order_index")
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@SoftDelete
@AuditEnabled
public class FlashcardSideContent extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "side_id", nullable = false)
    FlashcardSide side;

    @Enumerated(EnumType.STRING)
    @Column(name = "content_type", nullable = false, length = 20)
    ContentType contentType;

    @Column(name = "content_value", nullable = false, columnDefinition = "TEXT")
    String contentValue;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "metadata")
    Map<String, Object> metadata;
}
