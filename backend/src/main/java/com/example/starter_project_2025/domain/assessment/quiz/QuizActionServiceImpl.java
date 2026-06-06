package com.example.starter_project_2025.domain.assessment.quiz;

import com.example.starter_project_2025.domain.assessment.question.QuestionBank;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankMapper;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankRepository;
import com.example.starter_project_2025.domain.assessment.question.QuestionOption;
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
    public QuizDTO cloneForUser(Long quizId, Long userId) {
        Quiz source = load(quizId);

        Quiz copy = Quiz.builder()
                .levelId(source.getLevelId())
                .creatorId(userId)                       // now owned by the cloner
                .title(source.getTitle() + " (Copy)")
                .description(source.getDescription())
                .totalQuestions(0)
                .totalScore(0)
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

        // Deep-copy every referenced question into the cloner's own bank, then
        // point the new placements at those fresh questions (like cloning a deck).
        List<QuizQuestion> placements =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quizId);
        double totalScore = 0;
        for (QuizQuestion qq : placements) {
            QuestionBank src = questionBankRepository.findById(qq.getQuestionId()).orElse(null);
            if (src == null || Boolean.TRUE.equals(src.getIsDeleted())) continue;

            QuestionBank cloned = deepCopyQuestion(src, userId);
            QuestionBank savedQuestion = questionBankRepository.save(cloned);

            quizQuestionRepository.save(QuizQuestion.builder()
                    .quizId(savedQuiz.getId())
                    .sectionId(qq.getSectionId())
                    .questionId(savedQuestion.getId())
                    .orderIndex(qq.getOrderIndex())
                    .score(qq.getScore())
                    .isRequired(qq.isRequired())
                    .build());
            totalScore += qq.getScore();
        }

        savedQuiz.setTotalQuestions(placements.size());
        savedQuiz.setTotalScore(totalScore);
        return toDto(quizRepository.save(savedQuiz));
    }

    /** Copy a question (and its options) into a brand-new row owned by {@code userId}. */
    private QuestionBank deepCopyQuestion(QuestionBank src, Long userId) {
        QuestionBank copy = QuestionBank.builder()
                .levelId(src.getLevelId())
                .itemType(src.getItemType())
                .itemId(src.getItemId())
                .wordId(src.getWordId())
                .kanjiId(src.getKanjiId())
                .grammarSubUseId(src.getGrammarSubUseId())
                .questionType(src.getQuestionType())
                .prompt(src.getPrompt())
                .promptAudioUrl(src.getPromptAudioUrl())
                .promptImageUrl(src.getPromptImageUrl())
                .explanation(src.getExplanation())
                .hint(src.getHint())
                .difficultyLevel(src.getDifficultyLevel())
                .defaultScore(src.getDefaultScore())
                .createdByUser(userId)        // owned by the cloner
                .isSystemGenerated(false)
                .contentVersion(1)
                .options(new ArrayList<>())
                .build();

        if (src.getOptions() != null) {
            src.getOptions().stream()
                    .filter(o -> !Boolean.TRUE.equals(o.getIsDeleted()))
                    .forEach(o -> copy.getOptions().add(QuestionOption.builder()
                            .question(copy)
                            .content(o.getContent())
                            .contentAudioUrl(o.getContentAudioUrl())
                            .contentImageUrl(o.getContentImageUrl())
                            .isCorrect(o.isCorrect())
                            .explanation(o.getExplanation())
                            .orderIndex(o.getOrderIndex())
                            .build()));
        }
        return copy;
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

    @Override
    public void discardDraft(Long quizId, Long userId) {
        Quiz quiz = load(quizId);

        // Safety: only ever discard a never-published DRAFT, and only by its owner.
        if (userId != null && quiz.getCreatorId() != null && !userId.equals(quiz.getCreatorId())) {
            throw new ResourceNotFoundException("Quiz not found");
        }
        if (!"DRAFT".equals(quiz.getStatus()) || quiz.getPublishedAt() != null) {
            return; // published/archived quizzes are real — never auto-delete them
        }

        // 1) Delete questions that were quick-created privately for this quiz.
        List<QuestionBank> privateQuestions =
                questionBankRepository.findByOwnerQuizIdAndIsDeletedFalse(quizId);
        for (QuestionBank q : privateQuestions) q.setIsDeleted(true);
        questionBankRepository.saveAll(privateQuestions);

        // 2) Delete the question placements.
        List<QuizQuestion> placements =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quizId);
        for (QuizQuestion qq : placements) qq.setIsDeleted(true);
        quizQuestionRepository.saveAll(placements);

        // 3) Delete the draft quiz itself.
        quiz.setIsDeleted(true);
        quizRepository.save(quiz);
    }

    /* ── helpers ── */
    private Quiz load(Long quizId) {
        return quizRepository.findById(quizId)
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found"));
    }

    private QuizDTO toDto(Quiz quiz) {
        QuizDTO dto = QuizDTO.builder()
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
