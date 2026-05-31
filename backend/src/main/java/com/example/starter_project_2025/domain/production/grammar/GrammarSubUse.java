package com.example.starter_project_2025.domain.production.grammar;

import com.example.starter_project_2025.base.annotation.AutoCrud;
import com.example.starter_project_2025.base.annotation.Searchable;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.production.grammar.converter.CommonMistakesConverter;
import com.example.starter_project_2025.domain.production.grammar.model.CommonMistake;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.FieldDefaults;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Entity
@Getter
@Setter
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "grammar_sub_uses")
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("GRAMMAR_SUB_USE")
@ResourceMenu(title = "Ngữ pháp", group = "Tiếng Nhật", icon = "book-marked", url = "/grammar-sub-uses", order = 9)
@Searchable(fields = {"name", "jlptLevel", "detectorKey"})
@AutoCrud(path = "grammar-sub-uses")
public class GrammarSubUse extends BaseEntity {

    @Column(length = 100, nullable = false)
    String name;

    @Column(length = 10)
    String jlptLevel;

    @Column(columnDefinition = "TEXT")
    String nuanceDescription;

    @Column(length = 100, nullable = false, unique = true)
    String detectorKey;

    @Convert(converter = CommonMistakesConverter.class)
    @Column(columnDefinition = "TEXT")
    List<CommonMistake> commonMistakes;

    // ── Dictionary: this row is ONE usage (①②) of its parent expression ──

    /** Parent grammar expression this usage belongs to (nullable until backfilled). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grammar_id")
    Grammar grammar;

    /** Display order within the expression (①=1, ②=2, …). */
    Integer orderNo;

    /** Structure note shown under the meaning, e.g. "(Trong lúc / trước khi ~ thì …)". */
    @Column(columnDefinition = "TEXT")
    String structurePattern;

    /** "Ví dụ dễ nhớ": the Japanese example sentence. */
    @Column(columnDefinition = "TEXT")
    String exampleJp;

    /** Vietnamese translation of {@link #exampleJp}. */
    @Column(columnDefinition = "TEXT")
    String exampleVi;

    /** Optional italic note under the example. */
    @Column(columnDefinition = "TEXT")
    String exampleNote;
}
