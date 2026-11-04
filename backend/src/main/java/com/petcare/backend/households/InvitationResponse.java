package com.petcare.backend.households;

public record InvitationResponse(Long householdId, String householdName, MemberRole role, String invitedByName) {
}
