package com.example.starter_project_2025.domain.classroom.member;

import com.example.starter_project_2025.base.crud.domain.BaseCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClassMemberRepository extends BaseCrudRepository<ClassMember, Long> {

    List<ClassMember> findByClassroomIdAndIsActiveTrue(Long classroomId);

    List<ClassMember> findByUserIdAndIsActiveTrue(Long userId);

    Optional<ClassMember> findByClassroomIdAndUserId(Long classroomId, Long userId);

    boolean existsByClassroomIdAndUserId(Long classroomId, Long userId);

    long countByClassroomIdAndIsActiveTrue(Long classroomId);
}
