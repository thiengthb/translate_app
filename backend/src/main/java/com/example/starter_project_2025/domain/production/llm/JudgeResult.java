package com.example.starter_project_2025.domain.production.llm;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@AllArgsConstructor
public class JudgeResult {

    private final double meaningScore;

    private final boolean pointUsed;

    private final boolean grammarOk;

    private final String verdict;

    private final String feedback;
}
