package com.petcare.backend.households;

import java.util.List;

import com.petcare.backend.common.ForbiddenException;
import com.petcare.backend.common.ResourceNotFoundException;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Reglas de autorización por hogar. Quien no es miembro ACTIVE recibe 404 (no 403)
 * para no revelar que el hogar existe.
 */
@Service
@Transactional(readOnly = true)
public class HouseholdAccessService {

    public static final String HOUSEHOLD_NOT_FOUND = "El hogar no existe";

    private final HouseholdMemberRepository memberRepository;

    public HouseholdAccessService(HouseholdMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    public List<Long> householdIdsOf(Long userId) {
        return memberRepository.findByUserIdAndStatus(userId, MemberStatus.ACTIVE).stream()
                .map(HouseholdMember::getHouseholdId)
                .toList();
    }

    public boolean isMember(Long householdId, Long userId) {
        return householdId != null
                && memberRepository.existsByHouseholdIdAndUserIdAndStatus(householdId, userId, MemberStatus.ACTIVE);
    }

    public HouseholdMember requireMember(Long householdId, Long userId) {
        return memberRepository.findByHouseholdIdAndUserId(householdId, userId)
                .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException(HOUSEHOLD_NOT_FOUND));
    }

    public HouseholdMember requireOwner(Long householdId, Long userId) {
        HouseholdMember member = requireMember(householdId, userId);
        if (member.getRole() != MemberRole.OWNER) {
            throw new ForbiddenException();
        }
        return member;
    }

    public Long ownedHouseholdId(Long userId) {
        return memberRepository
                .findFirstByUserIdAndRoleAndStatusOrderByIdAsc(userId, MemberRole.OWNER, MemberStatus.ACTIVE)
                .map(HouseholdMember::getHouseholdId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No tienes un hogar propio. Indica el hogar de la mascota."));
    }
}
