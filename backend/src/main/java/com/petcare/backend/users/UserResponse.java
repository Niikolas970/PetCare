package com.petcare.backend.users;

// Solo datos públicos del usuario: nunca incluir el hash de la contraseña
public record UserResponse(Long id, String fullName, String email) {

    public static UserResponse of(User user) {
        return new UserResponse(user.getId(), user.getFullName(), user.getEmail());
    }
}
