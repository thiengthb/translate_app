package com.example.starter_project_2025.domain.library.quizlet.session_item;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizletSessionItemRepository extends BaseCrudRepository<QuizletSessionItem, Long> {
}
