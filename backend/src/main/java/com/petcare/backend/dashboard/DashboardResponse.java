package com.petcare.backend.dashboard;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.petcare.backend.tasks.CareTaskResponse;
import com.petcare.backend.timeline.TimelineItem;

public record DashboardResponse(
        Long householdId,
        String householdName,
        String timezone,
        LocalDate today,
        long activePetsCount,
        int upcomingDays,
        long upcomingTasksCount,
        long overdueTasksCount,
        List<PetCard> pets,
        List<TimelineItem> recentActivity
) {

    // lastWeightAt es null cuando el peso viene de la ficha de la mascota y no de una medición
    public record PetCard(
            Long id,
            String name,
            String species,
            BigDecimal lastWeightKg,
            LocalDateTime lastWeightAt,
            CareTaskResponse nextTask
    ) {
    }
}
