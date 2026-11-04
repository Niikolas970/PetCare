package com.petcare.backend.households;

// timezone: zona IANA del hogar (p. ej. America/Bogota); las fechas del hogar se guardan en esa hora local
public record HouseholdSummary(Long id, String name, String timezone, MemberRole myRole, long activePetsCount) {
}
