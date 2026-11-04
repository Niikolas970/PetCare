package com.petcare.backend.households;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface HouseholdMemberRepository extends JpaRepository<HouseholdMember, Long> {

    Optional<HouseholdMember> findByHouseholdIdAndUserId(Long householdId, Long userId);

    boolean existsByHouseholdIdAndUserIdAndStatus(Long householdId, Long userId, MemberStatus status);

    List<HouseholdMember> findByUserIdAndStatus(Long userId, MemberStatus status);

    List<HouseholdMember> findByHouseholdIdAndStatusInOrderByIdAsc(Long householdId, Collection<MemberStatus> statuses);

    Optional<HouseholdMember> findFirstByUserIdAndRoleAndStatusOrderByIdAsc(Long userId, MemberRole role, MemberStatus status);

    Optional<HouseholdMember> findFirstByHouseholdIdAndRoleAndStatusOrderByIdAsc(Long householdId, MemberRole role, MemberStatus status);
}
