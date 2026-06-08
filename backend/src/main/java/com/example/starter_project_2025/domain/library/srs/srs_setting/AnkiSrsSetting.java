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

    // NOTE: these newer knobs are intentionally NULLABLE. The default active
    // profile is MySQL with ddl-auto=update; adding a NOT NULL column without a
    // DB default to a table that already has rows would fail on startup. They
    // are always populated by AnkiSrsSettingController (firstNonNull → default),
    // so a row written through the normal flow never actually carries null.

    @Builder.Default
    @Column
    @FieldMeta(label = "Maximum Interval (days)", type = "number", order = 5, group = "Settings")
    Integer maximumIntervalDays = 36500;

    /** When the algorithm/parameters change, recompute due dates of existing
     *  REVIEW cards. Default false (Anki's safe default). Read by the FSRS
     *  reschedule flow; SM-2 ignores it. */
    @Builder.Default
    @Column
    @FieldMeta(label = "Reschedule Cards On Change", type = "checkbox", order = 6, group = "Settings")
    Boolean rescheduleCardsOnChange = false;

    /** Auto-suspend cards that lapse too often (a "leech"). */
    @Builder.Default
    @Column
    @FieldMeta(label = "Suspend Leeches", type = "checkbox", order = 7, group = "Settings")
    Boolean suspendLeeches = false;

    /** Lapse count at which a card is considered a leech. */
    @Builder.Default
    @Column
    @FieldMeta(label = "Leech Threshold", type = "number", order = 8, group = "Settings")
    Integer leechThreshold = 8;
}
