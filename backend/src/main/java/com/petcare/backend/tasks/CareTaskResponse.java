package com.petcare.backend.tasks;

import java.time.LocalDateTime;

// overdue es calculado: PENDING y dueAt anterior a la hora actual del hogar.
// sourceDoseId: dosis que generó la tarea (null si se creó a mano).
public record CareTaskResponse(
        Long id,
        Long petId,
        String petName,
        CareTaskType type,
        String title,
        LocalDateTime dueAt,
        String location,
        String notes,
        CareTaskStatus status,
        boolean overdue,
        LocalDateTime completedAt,
        Long completedBy,
        Long createdBy,
        LocalDateTime createdAt,
        Long sourceDoseId
) {

    public static CareTaskResponse of(CareTask task, String petName, LocalDateTime now) {
        return new CareTaskResponse(task.getId(), task.getPetId(), petName, task.getType(), task.getTitle(),
                task.getDueAt(), task.getLocation(), task.getNotes(), task.getStatus(), task.isOverdueAt(now),
                task.getCompletedAt(), task.getCompletedBy(), task.getCreatedBy(), task.getCreatedAt(),
                task.getSourceDoseId());
    }
}
