package com.petcare.backend.pets;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreatePetRequest(

        @NotNull(message = "El hogar es obligatorio")
        Long householdId,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar 100 caracteres")
        String name,

        @NotBlank(message = "La especie es obligatoria")
        @Size(max = 40, message = "La especie no puede superar 40 caracteres")
        String species,

        @Size(max = 100, message = "La raza no puede superar 100 caracteres")
        String breed,

        Sex sex,

        @PastOrPresent(message = "La fecha de nacimiento no puede ser futura")
        LocalDate birthDate,

        Boolean birthDateIsEstimated,

        @Positive(message = "El peso debe ser mayor que cero")
        @Digits(integer = 4, fraction = 3, message = "El peso tiene un formato inválido")
        BigDecimal weightKg,

        @Size(max = 2000, message = "Las notas no pueden superar 2000 caracteres")
        String notes
) implements PetDetails {
}