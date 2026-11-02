package com.petcare.backend.auth;

// Solo datos públicos: nunca incluir el hash de la contraseña
public record RegisteredUserResponse(Long id, String fullName, String email, Long householdId) {
}
