package com.example.starter_project_2025.base.workflow;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "workflow_transitions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkflowTransition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String entityName;

    @Column(nullable = false)
    private Long entityId;

    @Column(nullable = false, length = 50)
    private String fromState;

    @Column(nullable = false, length = 50)
    private String toState;

    private Long triggeredBy;

    @Column(length = 500)
    private String comment;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime transitionedAt;
}
