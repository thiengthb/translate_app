package com.example.starter_project_2025.system.analyze;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisResponse {

    private String originalText;

    private int tokenCount;

    private List<TokenDTO> tokens;
}
