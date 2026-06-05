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
@Table(name = "grammar_markers")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("GRAMMAR_MARKER")
@ResourceMenu(title = "Dấu hiệu ngữ pháp", group = "Tiếng Nhật", icon = "tag", url = "/grammar-markers", order = 10)
@Searchable(fields = {"markerPattern", "register", "detectorSubkey"})
@AutoCrud(path = "grammar-markers")
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
