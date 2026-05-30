package com.example.starter_project_2025.domain.library.srs.srs_setting;

import com.example.starter_project_2025.base.annotation.*;
import com.example.starter_project_2025.base.crud.domain.BaseEntity;
import com.example.starter_project_2025.domain.library.deck.Deck;
import com.example.starter_project_2025.domain.library.srs.algorithm_config.SrsAlgorithmConfig;
import com.example.starter_project_2025.init.annotation.ResourceMenu;
import com.example.starter_project_2025.init.annotation.ResourcePermission;
import com.example.starter_project_2025.system.rbac.user.User;
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
@Table(
        name = "anki_srs_settings",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_anki_srs_setting_user_deck",
                columnNames = {"user_id", "deck_id"}
        )
)
@FieldDefaults(level = AccessLevel.PRIVATE)
@ResourcePermission("ANKI_SRS_SETTING")
@ResourceMenu(
        title = "SRS Settings",
        group = "Anki SRS",
        icon = "settings",
        url = "/anki/settings",
        description = "Per-user Anki scheduling preferences.",
        order = 6,
        permission = "ANKI_SRS_SETTING_READ"
)
@EntityLabel(name = "SRS Setting", plural = "SRS Settings", description = "Per-deck SRS settings")
@AutoCrud(path = "anki/settings")
@Filterable(fields = {"isActive"})
@Sortable(fields = {"updatedAt"})
@AuditEnabled
public class AnkiSrsSetting extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "deck_id", nullable = false)
    Deck deck;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "algorithm_config_id")
    SrsAlgorithmConfig algorithmConfig;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Target Retention", type = "number", order = 1, group = "Settings")
    Double targetRetention = 0.9;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Max Reviews / Day", type = "number", order = 2, group = "Settings")
    Integer maxReviewsPerDay = 100;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "New Items / Day", type = "number", order = 3, group = "Settings")
    Integer maxItemsPerDay = 20;

    @Builder.Default
    @Column(nullable = false)
    @FieldMeta(label = "Bury Related Items", type = "checkbox", order = 4, group = "Settings")
    Boolean buryRelatedItems = true;
}
