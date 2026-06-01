package com.example.starter_project_2025.system.dictionary;

import lombok.Data;

import java.util.List;

@Data
public class HandwritingRequest {
    private List<List<List<Integer>>> strokes;
}