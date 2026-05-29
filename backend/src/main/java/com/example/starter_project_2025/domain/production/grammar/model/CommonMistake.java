package com.example.starter_project_2025.domain.production.grammar.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommonMistake {

    private String pattern;

    private String hint;
}
