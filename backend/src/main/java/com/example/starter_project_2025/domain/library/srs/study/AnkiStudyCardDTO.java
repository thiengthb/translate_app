package com.example.starter_project_2025.domain.library.srs.study;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiStudyCardDTO {

    Long flashcardId;
    String front;
    String back;
    String imageUrl;

    Long progressId;
    String state;
    Double easeFactor;
    Integer intervalDays;
    Integer reviewCount;
    Integer lapses;
    LocalDateTime nextReviewAt;
}
