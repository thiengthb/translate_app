package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "reference_sentences")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class ReferenceSentence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Column(columnDefinition = "TEXT", nullable = false)
    String l1Text;

    @Column(columnDefinition = "TEXT", nullable = false)
    String l2Text;
}
