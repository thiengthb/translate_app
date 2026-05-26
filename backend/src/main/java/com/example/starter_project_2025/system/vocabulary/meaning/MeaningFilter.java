package com.example.starter_project_2025.system.vocabulary.meaning;

import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import lombok.Builder;

@Builder
public class MeaningFilter extends BaseFilter {

    /** Filter by a specific language */
    Long languageId;
}
