package com.petcare.backend.households;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Crear (POST /api/households) y editar (PUT /api/households/{id}, solo OWNER)
public record SaveHouseholdRequest(

        @NotBlank(message = "El nombre del hogar es obligatorio")
        @Size(max = 120, message = "El nombre del hogar no puede superar 120 caracteres")
        String name,

        // Zona IANA, p. ej. America/Bogota. Si no se envía al crear, se usa America/Bogota
        @Size(max = 60, message = "La zona horaria no puede superar 60 caracteres")
        String timezone
) {
}
