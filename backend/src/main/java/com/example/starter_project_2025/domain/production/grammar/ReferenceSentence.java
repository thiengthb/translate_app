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
@Table(name = "reference_sentences")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("REFERENCE_SENTENCE")
@ResourceMenu(title = "Câu tham chiếu", group = "Tiếng Nhật", icon = "message-circle", url = "/reference-sentences", order = 11)
@Searchable(fields = {"l1Text", "l2Text"})
@AutoCrud(path = "reference-sentences")
public class ReferenceSentence extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sub_use_id", nullable = false)
    GrammarSubUse subUse;

    @Column(columnDefinition = "TEXT", nullable = false)
    String l1Text;

    @Column(columnDefinition = "TEXT", nullable = false)
    String l2Text;
}
