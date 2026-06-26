package com.example.starter_project_2025.domain.library.srs.srs_setting;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AnkiSrsSettingsRequest {

    Long algorithmConfigId;

    String algorithmConfigJson;

    Double targetRetention;

    Integer maxReviewsPerDay;

    Integer maxItemsPerDay;

    Boolean buryRelatedItems;

    Integer maximumIntervalDays;

    Boolean rescheduleCardsOnChange;

    Boolean suspendLeeches;

    Integer leechThreshold;
}
