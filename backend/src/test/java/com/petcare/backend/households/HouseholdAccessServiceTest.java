package com.petcare.backend.households;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import com.petcare.backend.common.ForbiddenException;
import com.petcare.backend.common.ResourceNotFoundException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class HouseholdAccessServiceTest {

    private static final Long HOUSEHOLD = 10L;
    private static final Long USER = 1L;

    @Mock
    private HouseholdMemberRepository memberRepository;

    private HouseholdAccessService service;

    @BeforeEach
    void setUp() {
        service = new HouseholdAccessService(memberRepository);
    }

    @Test
    @DisplayName("Un no miembro recibe 404 'El hogar no existe' (no 403, para no revelar el hogar)")
    void requireMemberRejectsNonMembersWith404() {
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireMember(HOUSEHOLD, USER))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("El hogar no existe");
    }

    @Test
    @DisplayName("Un invitado que no ha aceptado todavía no es miembro")
    void requireMemberRejectsInvitedMembers() {
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER))
                .thenReturn(Optional.of(member(MemberRole.CAREGIVER, MemberStatus.INVITED)));

        assertThatThrownBy(() -> service.requireMember(HOUSEHOLD, USER))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("Un exmiembro (INACTIVE) ya no es miembro")
    void requireMemberRejectsInactiveMembers() {
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER))
                .thenReturn(Optional.of(member(MemberRole.CAREGIVER, MemberStatus.INACTIVE)));

        assertThatThrownBy(() -> service.requireMember(HOUSEHOLD, USER))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void requireMemberAcceptsActiveMembers() {
        HouseholdMember active = member(MemberRole.CAREGIVER, MemberStatus.ACTIVE);
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER)).thenReturn(Optional.of(active));

        assertThat(service.requireMember(HOUSEHOLD, USER)).isSameAs(active);
    }

    @Test
    @DisplayName("Un CAREGIVER activo recibe 403 en acciones de OWNER")
    void requireOwnerRejectsCaregiversWith403() {
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER))
                .thenReturn(Optional.of(member(MemberRole.CAREGIVER, MemberStatus.ACTIVE)));

        assertThatThrownBy(() -> service.requireOwner(HOUSEHOLD, USER))
                .isInstanceOf(ForbiddenException.class)
                .hasMessage("No tienes permisos para realizar esta acción");
    }

    @Test
    @DisplayName("Un no miembro recibe 404 también en acciones de OWNER")
    void requireOwnerRejectsNonMembersWith404() {
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.requireOwner(HOUSEHOLD, USER))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void requireOwnerAcceptsOwners() {
        HouseholdMember owner = member(MemberRole.OWNER, MemberStatus.ACTIVE);
        when(memberRepository.findByHouseholdIdAndUserId(HOUSEHOLD, USER)).thenReturn(Optional.of(owner));

        assertThat(service.requireOwner(HOUSEHOLD, USER)).isSameAs(owner);
    }

    @Test
    void householdIdsOfReturnsOnlyActiveMemberships() {
        HouseholdMember a = member(MemberRole.OWNER, MemberStatus.ACTIVE);
        HouseholdMember b = member(MemberRole.CAREGIVER, MemberStatus.ACTIVE);
        b.setHouseholdId(20L);
        when(memberRepository.findByUserIdAndStatus(USER, MemberStatus.ACTIVE)).thenReturn(List.of(a, b));

        assertThat(service.householdIdsOf(USER)).containsExactly(HOUSEHOLD, 20L);
    }

    @Test
    void ownedHouseholdIdReturnsTheOwnedHousehold() {
        when(memberRepository.findFirstByUserIdAndRoleAndStatusOrderByIdAsc(USER, MemberRole.OWNER, MemberStatus.ACTIVE))
                .thenReturn(Optional.of(member(MemberRole.OWNER, MemberStatus.ACTIVE)));

        assertThat(service.ownedHouseholdId(USER)).isEqualTo(HOUSEHOLD);
    }

    @Test
    void ownedHouseholdIdFailsWhenTheUserOwnsNoHousehold() {
        when(memberRepository.findFirstByUserIdAndRoleAndStatusOrderByIdAsc(USER, MemberRole.OWNER, MemberStatus.ACTIVE))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.ownedHouseholdId(USER)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void isMemberIsFalseForNullHousehold() {
        assertThat(service.isMember(null, USER)).isFalse();
    }

    private static HouseholdMember member(MemberRole role, MemberStatus status) {
        HouseholdMember member = new HouseholdMember();
        member.setHouseholdId(HOUSEHOLD);
        member.setUserId(USER);
        member.setRole(role);
        member.setStatus(status);
        return member;
    }
}
