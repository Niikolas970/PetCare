package com.petcare.backend.tasks;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public final class CareTaskRequests {

    private CareTaskRequests() {
    }

    // Se usa para crear y para editar (PUT, solo tareas PENDING)
    public record SaveCareTask(
            @NotNull(message = "El tipo de tarea es obligatorio")
            CareTaskType type,

            @NotBlank(message = "El título es obligatorio")
            @Size(max = 150, message = "El título no puede superar 150 caracteres")
            String title,

            @NotNull(message = "La fecha de la tarea es obligatoria")
            LocalDateTime dueAt,

            @Size(max = 200, message = "El lugar no puede superar 200 caracteres")
            String location,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    // Ambos opcionales: completedAt por defecto es la hora actual del hogar
    public record CompleteCareTask(
            LocalDateTime completedAt,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record RescheduleCareTask(
            @NotNull(message = "La nueva fecha es obligatoria")
            LocalDateTime dueAt
    ) {
    }
}
