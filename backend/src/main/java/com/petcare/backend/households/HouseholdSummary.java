package com.petcare.backend.households;

public record HouseholdSummary(Long id, String name, MemberRole myRole, long activePetsCount) {
}
