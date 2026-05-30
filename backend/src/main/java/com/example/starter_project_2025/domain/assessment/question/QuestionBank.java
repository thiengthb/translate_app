package com.example.starter_project_2025.domain.assessment.question;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "question_bank")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("QUESTION")
@ResourceMenu(
        title = "Question Bank",
        group = "Assessment",
        icon = "help-circle",
        url = "/questions",
        order = 2,
        permission = "QUESTION_READ"
)
@EntityLabel(name = "Question", plural = "Questions", description = "Question bank")
@AutoCrud(path = "questions")
@Searchable(fields = {"prompt"})
@Filterable(fields = {"questionType", "difficultyLevel", "isActive"})
@Sortable(fields = {"createdAt", "updatedAt"})
@SoftDelete
@AuditEnabled
public class QuestionBank extends BaseEntity {

    @Column(name = "category_id")
    Long categoryId;

    @Column(name = "level_id")
    Long levelId;

    @Column(name = "item_type", length = 50)
    String itemType;

    @Column(name = "item_id")
    Long itemId;

    @Column(name = "word_id")
    Long wordId;

    @Column(name = "kanji_id")
    Long kanjiId;

    @Column(name = "grammar_sub_use_id")
    Long grammarSubUseId;

    @Column(name = "question_type", nullable = false, length = 50)
    String questionType;

    @Column(columnDefinition = "TEXT", nullable = false)
    String prompt;

    @Column(name = "prompt_audio_url")
    String promptAudioUrl;

    @Column(name = "prompt_image_url")
    String promptImageUrl;

    @Column(columnDefinition = "TEXT")
    String explanation;

    @Column(columnDefinition = "TEXT")
    String hint;

    @Column(name = "difficulty_level", length = 30)
    String difficultyLevel;

    @Builder.Default
    @Column(name = "default_score", nullable = false)
    double defaultScore = 1;

    @Column(name = "created_by_user")
    Long createdByUser;

    @Builder.Default
    @Column(name = "is_system_generated", nullable = false)
    boolean isSystemGenerated = false;

    @Builder.Default
    @Column(name = "content_version", nullable = false)
    int contentVersion = 1;

    @Builder.Default
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    List<QuestionOption> options = new ArrayList<>();
}
