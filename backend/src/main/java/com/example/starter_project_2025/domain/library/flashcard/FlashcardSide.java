package com.example.starter_project_2025.domain.library.flashcard;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
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
@Table(
        name = "flashcard_sides",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_flashcard_side",
                columnNames = {"flashcard_id", "side"}
        )
)
@FieldDefaults(level = AccessLevel.PRIVATE)
public class FlashcardSide extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flashcard_id", nullable = false)
    Flashcard flashcard;

    @Enumerated(EnumType.STRING)
    @Column(name = "side", nullable = false, length = 20)
    SideType side;

    @Builder.Default
    @OneToMany(mappedBy = "side", cascade = CascadeType.ALL, orphanRemoval = true)
    List<FlashcardSideContent> contents = new ArrayList<>();
}
