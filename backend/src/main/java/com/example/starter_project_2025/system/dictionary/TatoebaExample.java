package com.example.starter_project_2025.system.dictionary;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Câu ví dụ lấy từ Tatoeba (https://tatoeba.org) — corpus câu song ngữ cộng đồng.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class TatoebaExample {
    Long   sentenceId;
    String japanese;        // câu gốc tiếng Nhật
    String reading;         // furigana / phiên âm (nếu có)
    String translation;     // bản dịch
    String translationLang; // mã ngôn ngữ bản dịch: "vie" | "eng"
    String source;          // luôn là "Tatoeba"
}