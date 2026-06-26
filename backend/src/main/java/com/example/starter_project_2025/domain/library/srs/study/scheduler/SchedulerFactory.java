package com.example.starter_project_2025.domain.library.srs.study.scheduler;

import org.springframework.stereotype.Component;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;

/**
 * Resolves the right {@link SrsScheduler} for a deck/preset.
 *
 * <p>All scheduler beans (Sm2Scheduler, FsrsScheduler, …) are injected by Spring
 * and indexed by their {@link SrsScheduler#type()}. Unknown / "CUSTOM" / null
 * algorithm types fall back to SM-2, so the system never breaks on a
 * mis-configured preset.
 */
@Component
public class SchedulerFactory {

    private final Map<SchedulerType, SrsScheduler> registry = new EnumMap<>(SchedulerType.class);

    public SchedulerFactory(List<SrsScheduler> schedulers) {
        for (SrsScheduler scheduler : schedulers) {
            registry.put(scheduler.type(), scheduler);
        }
    }

    /** Resolve by algorithm-type string (e.g. "SM2", "FSRS"); defaults to SM-2. */
    public SrsScheduler resolve(String algorithmType) {
        SchedulerType type = SchedulerType.fromString(algorithmType);
        SrsScheduler scheduler = registry.get(type);
        return scheduler != null ? scheduler : registry.get(SchedulerType.SM2);
    }
}
