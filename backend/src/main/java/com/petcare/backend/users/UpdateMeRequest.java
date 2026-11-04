package com.petcare.backend.users;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

// Solo el nombre se puede cambiar; el correo identifica la cuenta
public record UpdateMeRequest(

        @NotBlank(message = "El nombre completo es obligatorio")
        @Size(max = 120, message = "El nombre completo no puede superar 120 caracteres")
        String fullName
) {
}
