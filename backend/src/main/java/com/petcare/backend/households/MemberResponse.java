package com.petcare.backend.households;

import java.time.LocalDateTime;

// Solo datos públicos del miembro: nunca incluir el hash de la contraseña
public record MemberResponse(Long userId, String fullName, String email, MemberRole role,
                             MemberStatus status, LocalDateTime joinedAt) {
}
