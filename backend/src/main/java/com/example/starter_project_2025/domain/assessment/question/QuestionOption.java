package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.annotation.AuditEnabled;
import com.example.starter_project_2025.base.annotation.SoftDelete;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "question_options")
@FieldDefaults(level = AccessLevel.PRIVATE)
@SoftDelete
@AuditEnabled
public class QuestionOption extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    QuestionBank question;

    @Column(columnDefinition = "TEXT", nullable = false)
    String content;

    @Column(name = "content_audio_url")
    String contentAudioUrl;

    @Column(name = "content_image_url")
    String contentImageUrl;

    @Builder.Default
    @Column(name = "is_correct", nullable = false)
    boolean isCorrect = false;

    @Column(columnDefinition = "TEXT")
    String explanation;

    @Builder.Default
    @Column(name = "order_index", nullable = false)
    int orderIndex = 0;
}
