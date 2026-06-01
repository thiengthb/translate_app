package com.example.starter_project_2025.domain.library.quizlet.study_session;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface QuizletStudySessionRepository extends BaseCrudRepository<QuizletStudySession, Long> {
}
