package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.domain.assessment.question.QuestionBank;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankMapper;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankRepository;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestion;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionDTO;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizActionServiceImpl implements QuizActionService {

    QuizRepository quizRepository;
    QuizQuestionRepository quizQuestionRepository;
    QuestionBankRepository questionBankRepository;
    QuestionBankMapper questionBankMapper;

    @Override
    public QuizDTO publish(Long quizId) {
        Quiz quiz = load(quizId);
        // Recompute totals from the placed questions
        List<QuizQuestion> questions =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quizId);
        double totalScore = questions.stream().mapToDouble(QuizQuestion::getScore).sum();
        quiz.setTotalQuestions(questions.size());
        quiz.setTotalScore(totalScore);
        quiz.setStatus("PUBLISHED");
        quiz.setPublishedAt(LocalDateTime.now());
        return toDto(quizRepository.save(quiz));
    }

    @Override
    public QuizDTO archive(Long quizId) {
        Quiz quiz = load(quizId);
        quiz.setStatus("ARCHIVED");
        return toDto(quizRepository.save(quiz));
    }

    @Override
    public QuizDTO duplicate(Long quizId, Long userId) {
        Quiz source = load(quizId);

        Quiz copy = Quiz.builder()
                .quizTypeId(source.getQuizTypeId())
                .categoryId(source.getCategoryId())
                .levelId(source.getLevelId())
                .creatorId(userId)
                .deckId(source.getDeckId())
                .title(source.getTitle() + " (copy)")
                .description(source.getDescription())
                .totalQuestions(source.getTotalQuestions())
                .totalScore(source.getTotalScore())
                .passScore(source.getPassScore())
                .timeLimitMinutes(source.getTimeLimitMinutes())
                .difficultyLevel(source.getDifficultyLevel())
                .isRandomQuestion(source.isRandomQuestion())
                .isRandomOption(source.isRandomOption())
                .allowRetake(source.isAllowRetake())
                .maxAttempts(source.getMaxAttempts())
                .showAnswerAfterSubmit(source.isShowAnswerAfterSubmit())
                .showExplanationAfterSubmit(source.isShowExplanationAfterSubmit())
                .visibility("PRIVATE")
                .status("DRAFT")
                .build();
        Quiz savedQuiz = quizRepository.save(copy);

        // Copy question placements (references to the shared question bank)
        List<QuizQuestion> questions =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quizId);
        for (QuizQuestion qq : questions) {
            quizQuestionRepository.save(QuizQuestion.builder()
                    .quizId(savedQuiz.getId())
                    .sectionId(qq.getSectionId())
                    .questionId(qq.getQuestionId())
                    .orderIndex(qq.getOrderIndex())
                    .score(qq.getScore())
                    .isRequired(qq.isRequired())
                    .build());
        }
        return toDto(savedQuiz);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizQuestionDTO> getQuestions(Long quizId) {
        List<QuizQuestion> questions =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quizId);
        List<QuizQuestionDTO> result = new ArrayList<>();
        for (QuizQuestion qq : questions) {
            QuizQuestionDTO dto = QuizQuestionDTO.builder()
                    .quizId(qq.getQuizId())
                    .sectionId(qq.getSectionId())
                    .questionId(qq.getQuestionId())
                    .orderIndex(qq.getOrderIndex())
                    .score(qq.getScore())
                    .isRequired(qq.isRequired())
                    .build();
            dto.setId(qq.getId());
            QuestionBank question = questionBankRepository.findById(qq.getQuestionId()).orElse(null);
            if (question != null) {
                dto.setQuestion(questionBankMapper.toResponse(question));
            }
            result.add(dto);
        }
        return result;
    }

    /* ── helpers ── */
    private Quiz load(Long quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found"));
    }

    private QuizDTO toDto(Quiz quiz) {
        QuizDTO dto = QuizDTO.builder()
                .quizTypeId(quiz.getQuizTypeId())
                .categoryId(quiz.getCategoryId())
                .levelId(quiz.getLevelId())
                .creatorId(quiz.getCreatorId())
                .deckId(quiz.getDeckId())
                .code(quiz.getCode())
                .title(quiz.getTitle())
                .description(quiz.getDescription())
                .totalQuestions(quiz.getTotalQuestions())
                .totalScore(quiz.getTotalScore())
                .passScore(quiz.getPassScore())
                .timeLimitMinutes(quiz.getTimeLimitMinutes())
                .difficultyLevel(quiz.getDifficultyLevel())
                .isRandomQuestion(quiz.isRandomQuestion())
                .isRandomOption(quiz.isRandomOption())
                .allowRetake(quiz.isAllowRetake())
                .maxAttempts(quiz.getMaxAttempts())
                .showAnswerAfterSubmit(quiz.isShowAnswerAfterSubmit())
                .showExplanationAfterSubmit(quiz.isShowExplanationAfterSubmit())
                .visibility(quiz.getVisibility())
                .status(quiz.getStatus())
                .publishedAt(quiz.getPublishedAt())
                .build();
        dto.setId(quiz.getId());
        dto.setIsActive(quiz.getIsActive());
        return dto;
    }
}
