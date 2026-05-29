package com.example.starter_project_2025.system.analyze;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenDTO {

    private String surface;

    private String reading;

    private String furigana;

    private String partOfSpeech;

    private String partOfSpeechVi;

    private String baseForm;
}
