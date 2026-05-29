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
@Table(name = "grammar_markers")
@FieldDefaults(level = AccessLevel.PRIVATE)
public class GrammarMarker extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Column(length = 100, nullable = false)
    String markerPattern;

    @Column(length = 30)
    String register;

    @Column
    Integer frequencyRank;

    @Column(length = 100)
    String detectorSubkey;
}
