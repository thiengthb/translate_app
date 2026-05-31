package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
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
@Table(name = "scenario_stubs")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("SCENARIO_STUB")
@ResourceMenu(title = "Tình huống", group = "Tiếng Nhật", icon = "layout-list", url = "/scenario-stubs", order = 12)
@Searchable(fields = {"situationContext", "register", "l1PromptTemplate"})
@AutoCrud(path = "scenario-stubs")
public class ScenarioStub extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Column(columnDefinition = "TEXT")
    String situationContext;

    @Column(length = 30)
    String register;

    @Column(columnDefinition = "TEXT")
    String l1PromptTemplate;

    /** Provenance marker: null/"SEED" for hand-seeded, "GENERATED" for AI-composed. */
    @Column(length = 20)
    String source;
}
