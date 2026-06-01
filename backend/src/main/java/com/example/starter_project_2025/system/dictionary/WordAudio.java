package com.example.starter_project_2025.system.dictionary;

import lombok.*;
import lombok.experimental.FieldDefaults;

/**
 * Đường dẫn audio phát âm một từ. Hiện lấy từ Forvo (phát âm người thật).
 * Khi không có audio, frontend tự fallback về Web Speech API (TTS trình duyệt).
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class WordAudio {
    String url;
    String source; // "forvo"
}