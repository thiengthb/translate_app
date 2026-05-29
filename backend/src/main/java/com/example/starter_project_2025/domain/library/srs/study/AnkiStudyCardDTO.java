package com.example.starter_project_2025.domain.library.srs.study;

import lombok.*;
import lombok.experimental.FieldDefaults;

import java.time.LocalDateTime;
import java.util.List;

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

    List<String> frontImages;
    List<String> frontAudios;
    List<String> frontVideos;

    List<String> backImages;
    List<String> backAudios;
    List<String> backVideos;

    Long progressId;
    String state;
    Double easeFactor;
    Integer intervalDays;
    Integer reviewCount;
    Integer lapses;
    LocalDateTime nextReviewAt;

    String againPreview;
    String hardPreview;
    String goodPreview;
    String easyPreview;
}
