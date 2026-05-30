package com.example.starter_project_2025.domain.assessment.attempt;

import java.util.List;

public interface QuizAttemptService {

    QuizAttemptDTO startAttempt(Long userId, StartAttemptRequest request);

    QuizAttemptDTO submitAnswer(Long userId, Long attemptId, SubmitAnswerRequest request);

    QuizAttemptDTO submitAttempt(Long userId, Long attemptId);

    QuizAttemptDTO getAttempt(Long userId, Long attemptId);

    List<QuizAttemptDTO> getMyAttempts(Long userId, Long quizId);
}
