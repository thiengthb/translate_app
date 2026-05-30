package com.example.starter_project_2025.domain.assessment.progress;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserQuizProgressRepository extends BaseCrudRepository<UserQuizProgress, Long> {

    Optional<UserQuizProgress> findByUserIdAndQuizId(Long userId, Long quizId);

    List<UserQuizProgress> findByUserId(Long userId);
}
