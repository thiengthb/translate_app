package com.example.starter_project_2025.domain.assessment.attempt;

import com.example.starter_project_2025.domain.assessment.progress.UserQuizProgress;
import com.example.starter_project_2025.domain.assessment.progress.UserQuizProgressRepository;
import com.example.starter_project_2025.domain.assessment.question.QuestionBank;
import com.example.starter_project_2025.domain.assessment.question.QuestionBankRepository;
import com.example.starter_project_2025.domain.assessment.question.QuestionOption;
import com.example.starter_project_2025.domain.assessment.quiz.Quiz;
import com.example.starter_project_2025.domain.assessment.quiz.QuizRepository;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestion;
import com.example.starter_project_2025.domain.assessment.quiz_question.QuizQuestionRepository;
import com.example.starter_project_2025.domain.classroom.assignment.ClassAssignment;
import com.example.starter_project_2025.domain.classroom.assignment.ClassAssignmentRepository;
import com.example.starter_project_2025.domain.classroom.classroom.Classroom;
import com.example.starter_project_2025.domain.classroom.classroom.ClassroomRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.reward.RewardService;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class QuizAttemptServiceImpl implements QuizAttemptService {

    QuizRepository quizRepository;
    QuizQuestionRepository quizQuestionRepository;
    QuestionBankRepository questionBankRepository;
    QuizAttemptRepository attemptRepository;
    QuizAttemptQuestionRepository attemptQuestionRepository;
    UserQuizProgressRepository progressRepository;
    ClassAssignmentRepository classAssignmentRepository;
    ClassroomRepository classroomRepository;
    RewardService rewardService;

    /* ──────────────────────────────────────────
       Start a new attempt — snapshots every question
    ────────────────────────────────────────── */
    @Override
    public QuizAttemptDTO startAttempt(Long userId, StartAttemptRequest request) {
        Quiz quiz = quizRepository.findById(request.getQuizId())
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found"));

        // Enforce attempt limits
        long existing = attemptRepository.countByUserIdAndQuizIdAndIsDeletedFalse(userId, quiz.getId());
        if (quiz.getMaxAttempts() != null && existing >= quiz.getMaxAttempts()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Maximum attempts reached for this quiz");
        }
        if (!quiz.isAllowRetake() && existing >= 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Retake is not allowed for this quiz");
        }

        // Assignment-scoped limit: when this attempt is started for a class
        // assignment, the assignment's own maxAttempts caps how many times the
        // student may attempt it (counted only against this assignment, not
        // free-play attempts on the same quiz).
        Long assignmentId = request.getAssignmentId();
        if (assignmentId != null) {
            ClassAssignment assignment = classAssignmentRepository.findById(assignmentId).orElse(null);
            if (assignment != null && assignment.getMaxAttempts() != null) {
                long usedForAssignment =
                        attemptRepository.countByUserIdAndAssignmentIdAndIsDeletedFalse(userId, assignmentId);
                if (usedForAssignment >= assignment.getMaxAttempts()) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Maximum attempts reached for this assignment");
                }
            }
        }

        LocalDateTime now = LocalDateTime.now();

        QuizAttempt attempt = QuizAttempt.builder()
                .userId(userId)
                .quizId(quiz.getId())
                .assignmentId(request.getAssignmentId())
                .status("IN_PROGRESS")
                .startedAt(now)
                .expiredAt(quiz.getTimeLimitMinutes() != null
                        ? now.plusMinutes(quiz.getTimeLimitMinutes()) : null)
                .attemptQuestions(new ArrayList<>())
                .build();

        List<QuizQuestion> quizQuestions =
                quizQuestionRepository.findByQuizIdAndIsDeletedFalseOrderByOrderIndexAsc(quiz.getId());
        if (quiz.isRandomQuestion()) {
            Collections.shuffle(quizQuestions);
        }

        double totalScore = 0;
        int order = 0;
        for (QuizQuestion qq : quizQuestions) {
            QuestionBank question = questionBankRepository.findById(qq.getQuestionId()).orElse(null);
            if (question == null || Boolean.TRUE.equals(question.getIsDeleted())) continue;

            QuizAttemptQuestion aq = QuizAttemptQuestion.builder()
                    .attempt(attempt)
                    .quizQuestionId(qq.getId())
                    .originalQuestionId(question.getId())
                    .sectionId(qq.getSectionId())
                    .questionType(question.getQuestionType())
                    .originalQuestionVersion(question.getContentVersion())
                    .questionSnapshot(buildQuestionSnapshot(question))
                    .optionsSnapshot(buildOptionsSnapshot(question))
                    .correctAnswerSnapshot(buildCorrectAnswer(question))
                    .orderIndex(order++)
                    .score(qq.getScore())
                    .isRequired(qq.isRequired())
                    .isAnswered(false)
                    .build();
            attempt.getAttemptQuestions().add(aq);
            totalScore += qq.getScore();
        }

        attempt.setTotalQuestions(attempt.getAttemptQuestions().size());
        attempt.setTotalScore(totalScore);
        QuizAttempt saved = attemptRepository.save(attempt);

        upsertProgressOnStart(userId, quiz.getId(), now);

        return assembleDto(saved, quiz);
    }

    /* ──────────────────────────────────────────
       Submit a single answer — grades it immediately
    ────────────────────────────────────────── */
    @Override
    public QuizAttemptDTO submitAnswer(Long userId, Long attemptId, SubmitAnswerRequest request) {
        QuizAttempt attempt = loadOwnedAttempt(userId, attemptId);
        if (!"IN_PROGRESS".equals(attempt.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attempt is already finished");
        }

        QuizAttemptQuestion aq = attempt.getAttemptQuestions().stream()
                .filter(q -> q.getId().equals(request.getAttemptQuestionId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Attempt question not found"));

        Map<String, Object> userAnswer = new LinkedHashMap<>();
        if (request.getSelectedOptionId() != null) userAnswer.put("selectedOptionId", request.getSelectedOptionId());
        if (request.getSelectedOptionIds() != null) userAnswer.put("selectedOptionIds", request.getSelectedOptionIds());
        if (request.getAnswerText() != null) userAnswer.put("answerText", request.getAnswerText());
        aq.setUserAnswerSnapshot(userAnswer);
        aq.setResponseTimeMs(request.getResponseTimeMs());
        aq.setAnswered(true);
        aq.setAnsweredAt(LocalDateTime.now());

        grade(aq);

        attemptQuestionRepository.save(aq);

        Quiz quiz = quizRepository.findById(attempt.getQuizId()).orElse(null);
        return assembleDto(attempt, quiz);
    }

    /* ──────────────────────────────────────────
       Finalise the attempt — totals + progress
    ────────────────────────────────────────── */
    @Override
    public QuizAttemptDTO submitAttempt(Long userId, Long attemptId) {
        QuizAttempt attempt = loadOwnedAttempt(userId, attemptId);
        if ("SUBMITTED".equals(attempt.getStatus())) {
            Quiz q = quizRepository.findById(attempt.getQuizId()).orElse(null);
            return assembleDto(attempt, q);
        }

        Quiz quiz = quizRepository.findById(attempt.getQuizId())
                .orElseThrow(() -> new ResourceNotFoundException("Quiz not found"));

        int answered = 0, correct = 0, wrong = 0, skipped = 0;
        double earned = 0;
        for (QuizAttemptQuestion aq : attempt.getAttemptQuestions()) {
            if (!aq.isAnswered()) {
                skipped++;
                continue;
            }
            answered++;
            earned += aq.getEarnedScore();
            if (Boolean.TRUE.equals(aq.getIsCorrect())) correct++;
            else if (Boolean.FALSE.equals(aq.getIsCorrect())) wrong++;
        }

        LocalDateTime now = LocalDateTime.now();
        double total = attempt.getTotalScore();
        double percentage = total > 0 ? Math.round((earned / total) * 10000.0) / 100.0 : 0;
        boolean passed = earned >= quiz.getPassScore();

        attempt.setAnsweredQuestions(answered);
        attempt.setCorrectQuestions(correct);
        attempt.setWrongQuestions(wrong);
        attempt.setSkippedQuestions(skipped);
        attempt.setEarnedScore(earned);
        attempt.setPercentage(percentage);
        attempt.setPassed(passed);
        attempt.setStatus("SUBMITTED");
        attempt.setSubmittedAt(now);
        attempt.setTimeSpentSeconds((int) Duration.between(attempt.getStartedAt(), now).getSeconds());

        QuizAttempt saved = attemptRepository.save(attempt);
        updateProgressOnSubmit(userId, quiz, saved);

        return assembleDto(saved, quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public QuizAttemptDTO getAttempt(Long userId, Long attemptId) {
        QuizAttempt attempt = loadOwnedAttempt(userId, attemptId);
        Quiz quiz = quizRepository.findById(attempt.getQuizId()).orElse(null);
        return assembleDto(attempt, quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public QuizAttemptDTO getAttemptForReview(Long requesterId, Long attemptId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));

        boolean isOwner = attempt.getUserId().equals(requesterId);
        boolean isGroupOwner = false;
        if (!isOwner && attempt.getAssignmentId() != null) {
            ClassAssignment assignment = classAssignmentRepository.findById(attempt.getAssignmentId()).orElse(null);
            if (assignment != null) {
                Classroom classroom = classroomRepository.findById(assignment.getClassroomId()).orElse(null);
                isGroupOwner = classroom != null && requesterId.equals(classroom.getOwnerId());
            }
        }
        if (!isOwner && !isGroupOwner) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to view this attempt");
        }

        Quiz quiz = quizRepository.findById(attempt.getQuizId()).orElse(null);
        return assembleDto(attempt, quiz);
    }

    @Override
    @Transactional(readOnly = true)
    public List<QuizAttemptDTO> getMyAttempts(Long userId, Long quizId) {
        return attemptRepository.findByUserIdAndQuizIdAndIsDeletedFalseOrderByStartedAtDesc(userId, quizId)
                .stream()
                .map(a -> assembleDto(a, null))
                .collect(Collectors.toList());
    }

    /* ──────────────────────────────────────────
       Grading engine
    ────────────────────────────────────────── */
    /**
     * Auto-grade a single answer using ONLY the frozen
     * {@code correct_answer_snapshot} on the attempt question. The live
     * {@code question_bank} / {@code question_options} are never queried here,
     * so editing a question after an attempt started can never change how that
     * attempt is graded.
     */
    private void grade(QuizAttemptQuestion aq) {
        String type = aq.getQuestionType();
        Map<String, Object> correct = aq.getCorrectAnswerSnapshot();
        Map<String, Object> answer = aq.getUserAnswerSnapshot();
        double full = aq.getScore();

        if ("WRITING".equals(type)) {
            // Manual / LLM grading — leave pending
            aq.setIsCorrect(null);
            aq.setEarnedScore(0);
            return;
        }

        boolean isCorrect;
        switch (type == null ? "" : type) {
            case "MULTIPLE_CHOICE" -> {
                Set<Long> chosen = new HashSet<>(toLongList(answer != null ? answer.get("selectedOptionIds") : null));
                Set<Long> key = new HashSet<>(correctOptionIds(correct));
                isCorrect = !key.isEmpty() && chosen.equals(key);
            }
            case "ORDERING", "MATCHING" -> {
                List<Long> chosen = toLongList(answer != null ? answer.get("selectedOptionIds") : null);
                List<Long> key = correctOptionIds(correct);
                isCorrect = !key.isEmpty() && chosen.equals(key);
            }
            case "FILL_BLANK" -> {
                String text = answer != null && answer.get("answerText") != null
                        ? normalize(String.valueOf(answer.get("answerText"))) : "";
                isCorrect = !text.isEmpty() && acceptedAnswers(correct).stream()
                        .map(QuizAttemptServiceImpl::normalize)
                        .anyMatch(a -> !a.isEmpty() && a.equals(text));
            }
            default -> { // SINGLE_CHOICE, TRUE_FALSE, LISTENING
                Long chosen = toLong(answer != null ? answer.get("selectedOptionId") : null);
                Long key = correctOptionId(correct);
                isCorrect = chosen != null && chosen.equals(key);
            }
        }

        aq.setIsCorrect(isCorrect);
        aq.setEarnedScore(isCorrect ? full : 0);
    }

    /* ── Snapshot answer-key readers (new shape, with legacy fallback) ── */

    private static List<Long> correctOptionIds(Map<String, Object> correct) {
        if (correct == null) return List.of();
        Object v = correct.get("correctOptionIds");
        if (v == null) v = correct.get("optionIds"); // legacy snapshots
        return toLongList(v);
    }

    private static Long correctOptionId(Map<String, Object> correct) {
        if (correct == null) return null;
        Long single = toLong(correct.get("correctOptionId"));
        if (single != null) return single;
        // legacy snapshots stored a list under "optionIds"
        List<Long> legacy = toLongList(correct.get("optionIds"));
        return legacy.isEmpty() ? null : legacy.get(0);
    }

    @SuppressWarnings("unchecked")
    private static List<String> acceptedAnswers(Map<String, Object> correct) {
        if (correct == null) return List.of();
        Object v = correct.get("acceptedAnswers");
        if (v instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object o : list) if (o != null) result.add(String.valueOf(o));
            return result;
        }
        // legacy snapshots stored a single accepted answer under "text"
        Object text = correct.get("text");
        return text != null ? List.of(String.valueOf(text)) : List.of();
    }

    /* ──────────────────────────────────────────
       Snapshot builders
    ────────────────────────────────────────── */
    private Map<String, Object> buildQuestionSnapshot(QuestionBank q) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", q.getId());
        map.put("questionType", q.getQuestionType());
        map.put("prompt", q.getPrompt());
        map.put("promptAudioUrl", q.getPromptAudioUrl());
        map.put("promptImageUrl", q.getPromptImageUrl());
        map.put("hint", q.getHint());
        map.put("explanation", q.getExplanation());
        return map;
    }

    /**
     * Snapshot of the options as shown to the student — deliberately WITHOUT
     * {@code isCorrect}. The correct answer lives only in
     * {@link #buildCorrectAnswer(QuestionBank)} so it can never leak through the
     * options payload, even if a client inspects the raw response.
     */
    private List<Map<String, Object>> buildOptionsSnapshot(QuestionBank q) {
        List<Map<String, Object>> list = new ArrayList<>();
        List<QuestionOption> options = q.getOptions() == null ? List.of() : q.getOptions();
        options.stream()
                .filter(o -> !Boolean.TRUE.equals(o.getIsDeleted()))
                .sorted(java.util.Comparator.comparingInt(QuestionOption::getOrderIndex))
                .forEach(o -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", o.getId());
                    m.put("questionId", q.getId());
                    m.put("content", o.getContent());
                    m.put("contentAudioUrl", o.getContentAudioUrl());
                    m.put("contentImageUrl", o.getContentImageUrl());
                    m.put("orderIndex", o.getOrderIndex());
                    list.add(m);
                });
        return list;
    }

    /**
     * The graded answer key, shaped per question type:
     * <ul>
     *   <li>SINGLE_CHOICE / TRUE_FALSE / LISTENING → {@code {correctOptionId}}</li>
     *   <li>MULTIPLE_CHOICE → {@code {correctOptionIds: [...]}}</li>
     *   <li>ORDERING / MATCHING → {@code {correctOptionIds: [ordered ids]}}</li>
     *   <li>FILL_BLANK → {@code {acceptedAnswers: [...]}}</li>
     * </ul>
     * Stored in the {@code correct_answer_snapshot} jsonb column and read back
     * verbatim at grading time — never re-derived from the live question.
     */
    private Map<String, Object> buildCorrectAnswer(QuestionBank q) {
        Map<String, Object> map = new LinkedHashMap<>();
        List<QuestionOption> active = (q.getOptions() == null ? List.<QuestionOption>of() : q.getOptions())
                .stream()
                .filter(o -> !Boolean.TRUE.equals(o.getIsDeleted()))
                .sorted(java.util.Comparator.comparingInt(QuestionOption::getOrderIndex))
                .collect(Collectors.toList());

        List<Long> correctIds = active.stream()
                .filter(QuestionOption::isCorrect)
                .map(QuestionOption::getId)
                .collect(Collectors.toList());

        switch (q.getQuestionType() == null ? "" : q.getQuestionType()) {
            case "MULTIPLE_CHOICE" -> map.put("correctOptionIds", correctIds);
            case "ORDERING", "MATCHING" ->
                    // Correct sequence = every option in its authored order.
                    map.put("correctOptionIds", active.stream()
                            .map(QuestionOption::getId)
                            .collect(Collectors.toList()));
            case "FILL_BLANK" ->
                    // Every correct option's content is an accepted answer.
                    map.put("acceptedAnswers", active.stream()
                            .filter(QuestionOption::isCorrect)
                            .map(QuestionOption::getContent)
                            .collect(Collectors.toList()));
            default -> // SINGLE_CHOICE, TRUE_FALSE, LISTENING
                    map.put("correctOptionId", correctIds.isEmpty() ? null : correctIds.get(0));
        }
        return map;
    }

    /* ──────────────────────────────────────────
       DTO assembly (with anti-cheat masking)
    ────────────────────────────────────────── */
    private QuizAttemptDTO assembleDto(QuizAttempt attempt, Quiz quiz) {
        boolean submitted = "SUBMITTED".equals(attempt.getStatus());

        QuizAttemptDTO dto = QuizAttemptDTO.builder()
                .userId(attempt.getUserId())
                .quizId(attempt.getQuizId())
                .assignmentId(attempt.getAssignmentId())
                .status(attempt.getStatus())
                .startedAt(attempt.getStartedAt())
                .submittedAt(attempt.getSubmittedAt())
                .timeSpentSeconds(attempt.getTimeSpentSeconds())
                .totalQuestions(attempt.getTotalQuestions())
                .answeredQuestions(attempt.getAnsweredQuestions())
                .correctQuestions(attempt.getCorrectQuestions())
                .wrongQuestions(attempt.getWrongQuestions())
                .skippedQuestions(attempt.getSkippedQuestions())
                .totalScore(attempt.getTotalScore())
                .earnedScore(attempt.getEarnedScore())
                .percentage(attempt.getPercentage())
                .isPassed(attempt.isPassed())
                .attemptQuestions(new ArrayList<>())
                .build();
        dto.setId(attempt.getId());
        dto.setIsActive(attempt.getIsActive());

        attempt.getAttemptQuestions().stream()
                .sorted(java.util.Comparator.comparingInt(QuizAttemptQuestion::getOrderIndex))
                .forEach(aq -> {
                    // Never reveal correctness mid-attempt — only after the whole quiz is submitted.
                    dto.getAttemptQuestions().add(toQuestionDto(aq, submitted));
                });
        return dto;
    }

    private QuizAttemptQuestionDTO toQuestionDto(QuizAttemptQuestion aq, boolean reveal) {
        // Defensive: new snapshots no longer store isCorrect inside options, but
        // strip it from any legacy snapshot anyway so the key never leaks through
        // the options payload. The answer key is exposed solely via
        // correctAnswerSnapshot, and only once reveal is allowed.
        List<Map<String, Object>> options = aq.getOptionsSnapshot() == null
                ? new ArrayList<>() : aq.getOptionsSnapshot();
        List<Map<String, Object>> safeOptions = new ArrayList<>();
        for (Map<String, Object> o : options) {
            Map<String, Object> copy = new LinkedHashMap<>(o);
            copy.remove("isCorrect");
            safeOptions.add(copy);
        }

        QuizAttemptQuestionDTO dto = QuizAttemptQuestionDTO.builder()
                .questionType(aq.getQuestionType())
                .originalQuestionVersion(aq.getOriginalQuestionVersion())
                .questionSnapshot(aq.getQuestionSnapshot())
                .optionsSnapshot(safeOptions)
                .correctAnswerSnapshot(reveal ? aq.getCorrectAnswerSnapshot() : null)
                .orderIndex(aq.getOrderIndex())
                .score(aq.getScore())
                .isAnswered(aq.isAnswered())
                .isCorrect(reveal ? aq.getIsCorrect() : null)
                .earnedScore(reveal ? aq.getEarnedScore() : 0)
                .answeredAt(aq.getAnsweredAt())
                .userAnswerSnapshot(reveal ? aq.getUserAnswerSnapshot() : null)
                .build();
        dto.setId(aq.getId());
        return dto;
    }

    /* ──────────────────────────────────────────
       Progress maintenance
    ────────────────────────────────────────── */
    private void upsertProgressOnStart(Long userId, Long quizId, LocalDateTime now) {
        UserQuizProgress progress = progressRepository.findByUserIdAndQuizId(userId, quizId)
                .orElseGet(() -> UserQuizProgress.builder()
                        .userId(userId).quizId(quizId).firstAttemptAt(now).build());
        progress.setAttemptCount(progress.getAttemptCount() + 1);
        progress.setLastAttemptAt(now);
        if (progress.getFirstAttemptAt() == null) progress.setFirstAttemptAt(now);
        if ("NOT_STARTED".equals(progress.getStatus())) progress.setStatus("IN_PROGRESS");
        progressRepository.save(progress);
    }

    private void updateProgressOnSubmit(Long userId, Quiz quiz, QuizAttempt attempt) {
        UserQuizProgress progress = progressRepository.findByUserIdAndQuizId(userId, quiz.getId())
                .orElseGet(() -> UserQuizProgress.builder()
                        .userId(userId).quizId(quiz.getId()).build());

        progress.setLatestAttemptId(attempt.getId());
        progress.setLatestScore(attempt.getEarnedScore());
        progress.setLatestPercentage(attempt.getPercentage());
        progress.setLastAttemptAt(attempt.getSubmittedAt());

        if (attempt.getEarnedScore() >= progress.getBestScore()) {
            progress.setBestScore(attempt.getEarnedScore());
            progress.setBestPercentage(attempt.getPercentage());
            progress.setBestAttemptId(attempt.getId());
        }

        if (attempt.isPassed()) {
            progress.setStatus("PASSED");
            if (progress.getPassedAt() == null) progress.setPassedAt(attempt.getSubmittedAt());
        } else if (!"PASSED".equals(progress.getStatus())) {
            // Keep PASSED if a previous attempt already passed; otherwise mark FAILED.
            progress.setStatus("FAILED");
        }
        progressRepository.save(progress);

        // Grant exp + coins for classroom quiz completion (no-op for free-play
        // quizzes and idempotent for repeated calls on the same attempt).
        rewardService.grantForAttempt(attempt);
    }

    /* ──────────────────────────────────────────
       Helpers
    ────────────────────────────────────────── */
    private QuizAttempt loadOwnedAttempt(Long userId, Long attemptId) {
        QuizAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> new ResourceNotFoundException("Attempt not found"));
        if (!attempt.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This attempt belongs to another user");
        }
        return attempt;
    }

    private static String normalize(String s) {
        return s == null ? "" : s.trim().toLowerCase().replaceAll("\\s+", " ");
    }

    @SuppressWarnings("unchecked")
    private static List<Long> toLongList(Object value) {
        List<Long> result = new ArrayList<>();
        if (value instanceof List<?> list) {
            for (Object o : list) {
                Long l = toLong(o);
                if (l != null) result.add(l);
            }
        }
        return result;
    }

    private static Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number n) return n.longValue();
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
