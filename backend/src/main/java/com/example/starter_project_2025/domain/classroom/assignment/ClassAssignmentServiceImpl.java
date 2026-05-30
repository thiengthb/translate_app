package com.example.starter_project_2025.domain.classroom.assignment;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import com.example.starter_project_2025.base.crud.dto.BaseFilter;
import com.example.starter_project_2025.base.crud.mapper.BaseCrudMapper;
import com.example.starter_project_2025.base.crud.service.BaseCrudServiceImpl;
import com.example.starter_project_2025.base.crud.validation.ValidationContext;
import com.example.starter_project_2025.domain.assessment.attempt.QuizAttempt;
import com.example.starter_project_2025.domain.assessment.attempt.QuizAttemptRepository;
import com.example.starter_project_2025.domain.assessment.quiz.Quiz;
import com.example.starter_project_2025.domain.assessment.quiz.QuizRepository;
import com.example.starter_project_2025.domain.classroom.member.ClassMember;
import com.example.starter_project_2025.domain.classroom.member.ClassMemberRepository;
import com.example.starter_project_2025.exception.ResourceNotFoundException;
import com.example.starter_project_2025.system.rbac.user.User;
import com.example.starter_project_2025.system.rbac.user.UserRepository;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class ClassAssignmentServiceImpl
        extends BaseCrudServiceImpl<ClassAssignment, Long, ClassAssignmentDTO, BaseFilter>
        implements ClassAssignmentService {

    ClassAssignmentMapper assignmentMapper;
    ClassAssignmentRepository assignmentRepository;
    QuizRepository quizRepository;
    QuizAttemptRepository attemptRepository;
    ClassMemberRepository memberRepository;
    UserRepository userRepository;

    @Override
    protected BaseCrudRepository<ClassAssignment, Long> getRepository() {
        return assignmentRepository;
    }

    @Override
    protected BaseCrudMapper<ClassAssignment, ClassAssignmentDTO> getMapper() {
        return assignmentMapper;
    }

    @Override
    protected String[] searchableFields() {
        return new String[]{"title", "description"};
    }

    @Override
    protected void beforeCreate(ClassAssignment entity, ClassAssignmentDTO request, ValidationContext ctx) {
        Long userId = getCurrentUserId();
        if (userId != null) entity.setCreatedBy(userId);
    }

    @Override
    protected ClassAssignmentDTO afterRead(ClassAssignmentDTO dto, ClassAssignment entity) {
        quizRepository.findById(entity.getQuizId()).ifPresent(q -> dto.setQuizTitle(q.getTitle()));
        return dto;
    }

    /* ── Custom actions ── */

    @Override
    @Transactional(readOnly = true)
    public List<ClassAssignmentDTO> getByClassroom(Long classroomId, String status) {
        List<ClassAssignment> list = (status == null || status.isBlank())
                ? assignmentRepository.findByClassroomIdAndIsDeletedFalseOrderByCreatedAtDesc(classroomId)
                : assignmentRepository.findByClassroomIdAndStatusAndIsDeletedFalseOrderByCreatedAtDesc(classroomId, status);
        return list.stream().map(this::toEnrichedDto).collect(Collectors.toList());
    }

    @Override
    public ClassAssignmentDTO publish(Long assignmentId) {
        ClassAssignment a = load(assignmentId);
        a.setStatus("PUBLISHED");
        return toEnrichedDto(assignmentRepository.save(a));
    }

    @Override
    public ClassAssignmentDTO close(Long assignmentId) {
        ClassAssignment a = load(assignmentId);
        a.setStatus("CLOSED");
        return toEnrichedDto(assignmentRepository.save(a));
    }

    @Override
    @Transactional(readOnly = true)
    public GradebookDTO getGradebook(Long assignmentId) {
        ClassAssignment assignment = load(assignmentId);
        boolean highest = "HIGHEST".equalsIgnoreCase(assignment.getScoreStrategy());

        List<ClassMember> members = memberRepository.findByClassroomIdAndIsActiveTrue(assignment.getClassroomId());
        Map<Long, List<QuizAttempt>> byUser = attemptRepository
                .findByAssignmentIdAndIsDeletedFalse(assignmentId)
                .stream()
                .collect(Collectors.groupingBy(QuizAttempt::getUserId));

        List<StudentResultDTO> results = new ArrayList<>();
        int passedCount = 0;
        double scoreSum = 0;
        int scoredStudents = 0;

        for (ClassMember member : members) {
            List<QuizAttempt> attempts = byUser.getOrDefault(member.getUserId(), List.of());
            List<QuizAttempt> submitted = attempts.stream()
                    .filter(a -> "SUBMITTED".equals(a.getStatus()))
                    .collect(Collectors.toList());

            User user = userRepository.findById(member.getUserId()).orElse(null);
            String displayName = user != null ? user.getFullName() : ("User #" + member.getUserId());

            if (submitted.isEmpty()) {
                results.add(StudentResultDTO.builder()
                        .userId(member.getUserId())
                        .displayName(displayName)
                        .attemptCount(attempts.size())
                        .bestScore(null)
                        .latestScore(null)
                        .isPassed(false)
                        .submittedAt(null)
                        .build());
                continue;
            }

            QuizAttempt best = submitted.stream()
                    .max(Comparator.comparingDouble(QuizAttempt::getEarnedScore)).orElse(submitted.get(0));
            QuizAttempt latest = submitted.stream()
                    .max(Comparator.comparing(QuizAttempt::getSubmittedAt,
                            Comparator.nullsFirst(Comparator.naturalOrder()))).orElse(submitted.get(0));

            boolean passed = highest ? best.isPassed() : latest.isPassed();
            double effectiveScore = highest ? best.getEarnedScore() : latest.getEarnedScore();

            results.add(StudentResultDTO.builder()
                    .userId(member.getUserId())
                    .displayName(displayName)
                    .attemptCount(attempts.size())
                    .bestScore(best.getEarnedScore())
                    .latestScore(latest.getEarnedScore())
                    .isPassed(passed)
                    .submittedAt(latest.getSubmittedAt())
                    .build());

            if (passed) passedCount++;
            scoreSum += effectiveScore;
            scoredStudents++;
        }

        double average = scoredStudents > 0 ? Math.round((scoreSum / scoredStudents) * 100.0) / 100.0 : 0;

        return GradebookDTO.builder()
                .assignmentId(assignmentId)
                .assignmentTitle(assignment.getTitle())
                .totalStudents(members.size())
                .passedCount(passedCount)
                .averageScore(average)
                .results(results)
                .build();
    }

    /* ── helpers ── */
    private ClassAssignment load(Long id) {
        return assignmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assignment not found"));
    }

    private ClassAssignmentDTO toEnrichedDto(ClassAssignment a) {
        ClassAssignmentDTO dto = assignmentMapper.toResponse(a);
        quizRepository.findById(a.getQuizId()).ifPresent(q -> dto.setQuizTitle(q.getTitle()));
        return dto;
    }
}
