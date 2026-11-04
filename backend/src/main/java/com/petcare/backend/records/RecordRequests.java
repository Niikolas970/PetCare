package com.petcare.backend.records;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Cuerpos de creación de registros. occurredAt es opcional en todos:
 * si no se envía se usa la hora actual del hogar. No puede ser futura.
 */
public final class RecordRequests {

    private RecordRequests() {
    }

    public record CreateHealthRecord(
            @NotNull(message = "El tipo de registro es obligatorio")
            HealthRecordType recordType,

            @NotBlank(message = "El título es obligatorio")
            @Size(max = 150, message = "El título no puede superar 150 caracteres")
            String title,

            @Size(max = 5000, message = "La descripción no puede superar 5000 caracteres")
            String description,

            @Size(max = 120, message = "El veterinario no puede superar 120 caracteres")
            String veterinarian,

            LocalDateTime occurredAt
    ) {
    }

    public record CreateDose(
            @NotNull(message = "Indica si es VACCINE o DEWORMING")
            DoseKind kind,

            @NotBlank(message = "El producto es obligatorio")
            @Size(max = 120, message = "El producto no puede superar 120 caracteres")
            String productName,

            LocalDateTime occurredAt,

            // Si viene, se crea automáticamente una tarea PENDING para esa fecha
            LocalDate nextDueOn,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record CreateTreatment(
            @NotBlank(message = "El medicamento es obligatorio")
            @Size(max = 120, message = "El medicamento no puede superar 120 caracteres")
            String medication,

            @Size(max = 80, message = "La dosis no puede superar 80 caracteres")
            String dosage,

            @Size(max = 80, message = "La frecuencia no puede superar 80 caracteres")
            String frequency,

            LocalDateTime occurredAt,

            LocalDate endsOn,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record CreateMeal(
            @NotBlank(message = "El alimento es obligatorio")
            @Size(max = 120, message = "El alimento no puede superar 120 caracteres")
            String food,

            @Size(max = 60, message = "La cantidad no puede superar 60 caracteres")
            String quantity,

            LocalDateTime occurredAt,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record CreateWeight(
            @NotNull(message = "El peso es obligatorio")
            @Positive(message = "El peso debe ser mayor que cero")
            @Digits(integer = 4, fraction = 3, message = "El peso tiene un formato inválido")
            BigDecimal weightKg,

            LocalDateTime occurredAt,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record CreateWellbeing(
            @NotNull(message = "El ánimo es obligatorio")
            Mood mood,

            Level energy,

            Level appetite,

            LocalDateTime occurredAt,

            @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
            String notes
    ) {
    }

    public record DoseCreated(PreventiveDose dose, Long generatedTaskId) {
    }

    // Cuerpo opcional de la anulación
    public record VoidRecord(
            @Size(max = 300, message = "El motivo no puede superar 300 caracteres")
            String reason
    ) {
    }
}
